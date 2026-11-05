// Where the icons on the Poot XP desktop start out. Nothing here is a grid.
// It's a child's desktop: a couple of groups of things that belong together
// get dragged into a corner (not every member makes it, a stray or two get
// left behind), and everything else is dropped here and there wherever there
// was room. A different mess each visit (the seed), but the same one for as
// long as the visit lasts. Kept free of imports so the unit tests can load it.

export interface Point {
  x: number;
  y: number;
}

/** The size an icon takes up, label included, for working out whether two collide. */
export const ICON_W = 91;
export const ICON_H = 98;

/** Spacing for things dropped here and there, and for things piled into a corner. */
const LOOSE_X = 98;
const LOOSE_Y = 100;
const TIGHT_X = 90;
const TIGHT_Y = 88;
const MARGIN = 8;
/** How much of a group usually makes it into its corner. */
const JOIN_CHANCE = 0.8;

type Corner = { left: boolean; top: boolean };

export interface LayoutEnv {
  /** The desktop's size (the screen above the taskbar). */
  width: number;
  height: number;
  /** The strip, left edge to right edge, that a window covers when the PC starts. Icons prefer to stay out of it. */
  covered?: [number, number];
  seed: number;
  /** The groups that can be gathered into a corner. */
  groups: string[];
  /** How many groups get gathered. */
  clusters?: number;
}

export interface IconSpec {
  id: string;
  group?: string;
}

export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashText(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** `count` items picked at random from a list, the same ones every time for the same seed. */
export function sample<T>(list: readonly T[], count: number, seed: number): T[] {
  const random = mulberry32(seed);
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out.slice(0, count);
}

/** Keeps an icon fully on the desktop. */
export function clampPoint(p: Point, width: number, height: number): Point {
  return {
    x: Math.round(Math.min(Math.max(p.x, 0), Math.max(0, width - ICON_W))),
    y: Math.round(Math.min(Math.max(p.y, 0), Math.max(0, height - ICON_H))),
  };
}

interface Cluster {
  corner: Corner;
  perColumn: number;
  maxSlots: number;
  used: number;
}

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Too close for two icons to read: `slack` is how much of an icon's room they may share (0 is none). */
const overlaps = (a: Point, b: Point, slack: number) =>
  Math.abs(a.x - b.x) < LOOSE_X * (0.85 - slack) && Math.abs(a.y - b.y) < LOOSE_Y * (0.85 - slack);
const hits = (p: Point, box: Box) =>
  p.x < box.x + box.w && p.x + ICON_W > box.x && p.y < box.y + box.h && p.y + ICON_H > box.y;

export function createLayout(env: LayoutEnv) {
  const { width, height, covered, seed } = env;
  const random = mulberry32(seed);
  const rows = Math.max(1, Math.floor((height - MARGIN * 2) / TIGHT_Y));

  // Corners with room outside the window cover: a corner of the desktop that is
  // hidden behind the browser is no use as a place to tidy things into.
  const corners: Corner[] = [];
  const leftRoom = covered ? covered[0] : width;
  const rightRoom = covered ? width - covered[1] : width;
  for (const top of [true, false]) {
    if (leftRoom >= ICON_W * 0.75) corners.push({ left: true, top });
    if (rightRoom >= ICON_W * 0.75) corners.push({ left: false, top });
  }
  const shuffle = <T,>(list: T[]) => {
    const out = [...list];
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  };

  const clusters = new Map<string, Cluster>();
  const reserved: Box[] = [];
  const freeCorners = shuffle(corners);
  for (const group of shuffle(env.groups)) {
    if (clusters.size >= (env.clusters ?? 2)) break;
    const corner = freeCorners.pop();
    if (!corner) break;
    // A corner beside the window cover is one icon wide; a roomier one takes a few.
    const room = corner.left ? leftRoom : rightRoom;
    const narrow = room < TIGHT_X * 2 + MARGIN;
    const perColumn = Math.max(2, Math.min(rows, narrow ? 5 : 3));
    const columns = narrow ? 1 : 3;
    clusters.set(group, { corner, perColumn, maxSlots: perColumn * columns, used: 0 });
    const w = columns * TIGHT_X + MARGIN;
    const h = perColumn * TIGHT_Y + MARGIN;
    reserved.push({
      x: corner.left ? 0 : width - w,
      y: corner.top ? 0 : height - h,
      w,
      h,
    });
  }

  const placed = new Map<string, Point>();

  const slot = (cluster: Cluster, id: string): Point => {
    const k = cluster.used++;
    const col = Math.floor(k / cluster.perColumn);
    const row = k % cluster.perColumn;
    const own = mulberry32(hashText(`${seed}:${id}:tight`));
    const jx = (own() * 2 - 1) * 7;
    const jy = (own() * 2 - 1) * 6;
    const { left, top } = cluster.corner;
    return {
      x: (left ? MARGIN + col * TIGHT_X : width - ICON_W - MARGIN - col * TIGHT_X) + jx,
      y: (top ? MARGIN + row * TIGHT_Y : height - ICON_H - MARGIN - row * TIGHT_Y) + jy,
    };
  };

  // Out of the window cover first, then anywhere if there is no room left.
  const outside: [number, number][] = [];
  if (covered) {
    outside.push([MARGIN, covered[0] - ICON_W + 15], [covered[1] - 10, width - ICON_W - MARGIN]);
  }
  const ranges = outside.filter(([lo, hi]) => hi > lo);

  const loose = (id: string): Point => {
    const own = mulberry32(hashText(`${seed}:${id}:loose`));
    const top = MARGIN;
    const bottom = Math.max(top, height - ICON_H - MARGIN);
    const taken = [...placed.values()];
    let last: Point = { x: MARGIN, y: top };
    // Fussy first: clear of the window and of every other icon. Then, with the
    // strips beside the window full, let icons half-overlap (it is a mess,
    // after all) before sending one under the window.
    const phases = [
      { anywhere: false, slack: 0, tries: 100 },
      { anywhere: false, slack: 0.4, tries: 80 },
      { anywhere: true, slack: 0, tries: 60 },
      { anywhere: true, slack: 0.85, tries: 1 },
    ];
    for (const { anywhere: wide, slack, tries } of phases) {
      for (let attempt = 0; attempt < tries; attempt++) {
        let x: number;
        if (wide || ranges.length === 0) {
          x = MARGIN + own() * Math.max(0, width - ICON_W - MARGIN * 2);
        } else {
          const total = ranges.reduce((sum, [lo, hi]) => sum + (hi - lo), 0);
          let pick = own() * total;
          const [lo, hi] = ranges.find(([l, h]) => (pick -= h - l) < 0) ?? ranges[0];
          x = lo + own() * (hi - lo);
        }
        last = { x, y: top + own() * (bottom - top) };
        if (!taken.some((t) => overlaps(last, t, slack)) && !reserved.some((r) => hits(last, r))) return last;
      }
    }
    return last;
  };

  return {
    /** The spot for an icon. The same icon always gets the same spot. */
    place({ id, group }: IconSpec): Point {
      const known = placed.get(id);
      if (known) return known;
      const cluster = group ? clusters.get(group) : undefined;
      const joins = cluster && cluster.used < cluster.maxSlots && mulberry32(hashText(`${seed}:${id}:join`))() < JOIN_CHANCE;
      const point = clampPoint(joins && cluster ? slot(cluster, id) : loose(id), width, height);
      placed.set(id, point);
      return point;
    },
    /** For the tests: which groups were gathered, and into which corner. */
    clusters: () => [...clusters].map(([group, c]) => ({ group, ...c.corner })),
  };
}
