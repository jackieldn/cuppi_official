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
/** The screen's corner radius, measured: 16.75% of its width. */
export const SCREEN_RADIUS = Math.round(SCREEN_W * 0.1675);

/** Mirrors a mockup left to right. The screenshot itself is never mirrored, so the quad's corners swap sides. */
export function flipQuad(q: Quad, width: number): Quad {
  const m = ([x, y]: Point): Point => [width - x, y];
  return { tl: m(q.tr), tr: m(q.tl), br: m(q.bl), bl: m(q.br) };
}

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
