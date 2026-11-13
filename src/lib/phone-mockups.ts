// The phone mockups in /public/phone-frames, and the maths to put a screenshot in them.
//
// Each mockup is a transparent render of an iPhone whose screen is a see-through
// hole. The screenshot is placed BEHIND the frame, so the frame's own black bezel
// does the masking. The tilted render shows the screen in perspective, so the flat
// screenshot is warped onto the screen's four corners with a CSS matrix3d.
//
// The corners below were measured from the images (the four screen edges fitted
// as straight lines, then intersected), in the images' own pixels.

export type Point = [number, number];
export type Quad = { tl: Point; tr: Point; br: Point; bl: Point };

export type MockupKind = 'front' | 'tilt';

export const MOCKUPS: Record<MockupKind, { src: string; width: number; height: number; screen: Quad }> = {
  front: {
    src: '/phone-frames/iphone-front-mockup.png',
    width: 1046,
    height: 2162,
    screen: { tl: [45, 40.5], tr: [1000, 40.5], br: [1000, 2122], bl: [45, 2122] },
  },
  tilt: {
    src: '/phone-frames/iphone-45d-mockup.png',
    width: 842,
    height: 2205,
    screen: { tl: [88, 96.6], tr: [823, 32.1], br: [823, 2038.6], bl: [88, 2193.8] },
  },
};

/** The flat screenshot layer is laid out at this size (the real screen's proportions), then warped. */
export const SCREEN_W = 955;
export const SCREEN_H = 2082;
/**
 * The corner radius of the screenshot layer. The frame's own screen opening measures about 15% of the screen
 * width (the real phone's 16.75% does not match this render). The layer is a touch tighter, 14%, so it always
 * covers the opening (a see-through wedge shows in the corners if it is rounder), and a touch rounder than
 * square, so its corners stay inside the opaque bezel instead of poking out past the phone's outline.
 */
export const SCREEN_RADIUS = Math.round(SCREEN_W * 0.14);

/** Mirrors a mockup left to right. The screenshot itself is never mirrored, so the quad's corners swap sides. */
export function flipQuad(q: Quad, width: number): Quad {
  const m = ([x, y]: Point): Point => [width - x, y];
  return { tl: m(q.tr), tr: m(q.tl), br: m(q.bl), bl: m(q.br) };
}

/**
 * The quad pushed outwards by `px` on every side (measured in the image's own pixels, about the quad's centre).
 * The screenshot is laid a few pixels bigger than the screen opening, so its edges are always under the frame's
 * opaque bezel: lined up exactly, anti-aliasing leaves a hairline of whatever is behind the phone along the edge.
 */
export function growQuad(q: Quad, px: number): Quad {
  const pts = [q.tl, q.tr, q.br, q.bl];
  const cx = pts.reduce((n, p) => n + p[0], 0) / 4;
  const cy = pts.reduce((n, p) => n + p[1], 0) / 4;
  const w = (Math.hypot(q.tr[0] - q.tl[0], q.tr[1] - q.tl[1]) + Math.hypot(q.br[0] - q.bl[0], q.br[1] - q.bl[1])) / 2;
  const h = (Math.hypot(q.bl[0] - q.tl[0], q.bl[1] - q.tl[1]) + Math.hypot(q.br[0] - q.tr[0], q.br[1] - q.tr[1])) / 2;
  const g = ([x, y]: Point): Point => [cx + (x - cx) * (1 + (2 * px) / w), cy + (y - cy) * (1 + (2 * px) / h)];
  return { tl: g(q.tl), tr: g(q.tr), br: g(q.br), bl: g(q.bl) };
}

/** How far the screenshot reaches under the bezel, in the mockup image's pixels. The bezel is about 25px thick. */
export const OVERSCAN = 6;

/**
 * The perspective transform (a homography) that carries the rectangle
 * (0,0)-(w,h) onto the quad. Returns [h11, h12, h13, h21, h22, h23, h31, h32]
 * (h33 is 1), solved from the four corner pairs.
 */
export function solveHomography(w: number, h: number, quad: Quad): number[] {
  const src: Point[] = [[0, 0], [w, 0], [w, h], [0, h]];
  const dst: Point[] = [quad.tl, quad.tr, quad.br, quad.bl];
  const A: number[][] = [];
  const b: number[] = [];
  for (let i = 0; i < 4; i++) {
    const [x, y] = src[i];
    const [u, v] = dst[i];
    A.push([x, y, 1, 0, 0, 0, -u * x, -u * y]);
    b.push(u);
    A.push([0, 0, 0, x, y, 1, -v * x, -v * y]);
    b.push(v);
  }
  // Gaussian elimination with partial pivoting.
  const n = 8;
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
    [A[c], A[p]] = [A[p], A[c]];
    [b[c], b[p]] = [b[p], b[c]];
    for (let r = c + 1; r < n; r++) {
      const f = A[r][c] / A[c][c];
      for (let k = c; k < n; k++) A[r][k] -= f * A[c][k];
      b[r] -= f * b[c];
    }
  }
  const hs = new Array<number>(n).fill(0);
  for (let r = n - 1; r >= 0; r--) {
    let s = b[r];
    for (let k = r + 1; k < n; k++) s -= A[r][k] * hs[k];
    hs[r] = s / A[r][r];
  }
  return hs;
}

/** Where a point of the flat rectangle lands. Used to check the maths. */
export function applyHomography(hs: number[], x: number, y: number): Point {
  const d = hs[6] * x + hs[7] * y + 1;
  return [(hs[0] * x + hs[1] * y + hs[2]) / d, (hs[3] * x + hs[4] * y + hs[5]) / d];
}

/** The same transform as a CSS matrix3d() value (use with transform-origin: 0 0). */
export function quadToMatrix3d(w: number, h: number, quad: Quad): string {
  const [h11, h12, h13, h21, h22, h23, h31, h32] = solveHomography(w, h, quad);
  const v = [h11, h21, 0, h31, h12, h22, 0, h32, 0, 0, 1, 0, h13, h23, 0, 1];
  return `matrix3d(${v.map((n) => +n.toFixed(8)).join(',')})`;
}

/** Where the screen starts and ends down the phone's own height, as fractions (0 to 1) of the phone. */
export function screenSpan(kind: MockupKind): { top: number; bottom: number } {
  const m = MOCKUPS[kind];
  const { tl, tr, br, bl } = m.screen;
  return { top: Math.min(tl[1], tr[1]) / m.height, bottom: Math.max(bl[1], br[1]) / m.height };
}

/**
 * How far down the phone's own height the end of a screenshot reaches, as a fraction of the phone (0 to 1). The
 * screenshot is as wide as the screen, so it stands `shotHeight / shotWidth` screen-widths tall; one shorter than the
 * screen only fills the top of it (the app's background colour fills the rest), and one taller is cropped by it.
 */
/** Within this share of the screen's height, a screenshot counts as filling the screen. */
export const NEAR_FULL = 0.95;

/** The screenshot's height as a share of what the screen is tall for its width (1 is exactly screen-shaped). */
export const screenFill = (shotWidth: number, shotHeight: number): number => shotHeight / shotWidth / (SCREEN_H / SCREEN_W);

/**
 * True for a screenshot that is almost, but not quite, tall enough for the screen (real iPhone screenshots are 0.7% short
 * of this render's screen). It is scaled up to fill the screen, trimming a sliver off its sides, instead of leaving a
 * strip of the background colour along the bottom.
 */
export const fillsScreenByCover = (shotWidth: number, shotHeight: number): boolean => {
  const f = screenFill(shotWidth, shotHeight);
  return f >= NEAR_FULL && f < 1;
};

export function contentEndFrac(kind: MockupKind, shotWidth: number, shotHeight: number): number {
  const { top, bottom } = screenSpan(kind);
  const ratio = screenFill(shotWidth, shotHeight);
  // Real phone screenshots are a hair off this render's screen shape (an iPhone 15's is 0.7% shorter): within 5% counts as full
  // (and is drawn to fill the screen, see fillsScreenByCover).
  const filled = ratio >= NEAR_FULL ? 1 : ratio;
  return top + (bottom - top) * filled;
}

/**
 * Where the top edge of a phone `heightPct` tall (% of its box) sits when it shows the BOTTOM of its screenshot, for a
 * phone that hangs from `topPct` when it shows the top. The gap above the phone in a top view is repeated below it:
 * the phone's bottom edge (its bezel included) sits `topPct` above the bottom of the box, so the phone is whole at
 * both ends. A screenshot shorter than the screen ends higher up the phone, so the phone moves up by less, to put the
 * end of the screenshot where a full one would end (it never slides up into empty background). Never lower than the
 * top view.
 */
export function bottomViewTop(kind: MockupKind, shotWidth: number, shotHeight: number, topPct: number, heightPct: number): number {
  const sb = screenSpan(kind).bottom;
  return Math.min(topPct, 100 - topPct - heightPct * (1 - sb + contentEndFrac(kind, shotWidth, shotHeight)));
}

/** The top edge of a single phone for each view, in % of its box (see bottomViewTop). */
export function phoneTops(kind: MockupKind, shotWidth: number, shotHeight: number, topPct = 7, heightPct = 165): { top: number; bottom: number } {
  return { top: topPct, bottom: Math.round(bottomViewTop(kind, shotWidth, shotHeight, topPct, heightPct) * 10) / 10 };
}
