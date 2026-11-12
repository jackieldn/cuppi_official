// The app's background patterns, slimmed for the web (the originals in /public/patterns
// are 0.6 to 1MB each; the *.min.svg copies keep only what shows). Each is a 500 x 500
// tile of white shapes, so laying one over a colour is a matter of opacity.
export const PATTERNS = {
  victorianWinter: '/patterns/victorianWinter.min.svg',
  autumnPorch: '/patterns/autumnPorch.min.svg',
  summerTea: '/patterns/summerTea.min.svg',
  springGarden: '/patterns/springGarden.min.svg',
} as const;

export type PatternName = keyof typeof PATTERNS;

/** The house look: a quiet patch of 5% around what we want looked at, easing to 30% at the corners. */
export const PATTERN_DEFAULTS = { size: 420, centre: 0.05, edge: 0.3 } as const;

export type PatternFade = {
  shape: 'circle' | 'ellipse';
  /** Where the quiet patch is, as a CSS position, e.g. "72% 45%". */
  focus: string;
  /** Opacity at the focus, 0 to 1. */
  centre: number;
  /** Opacity at the farthest corner, 0 to 1. */
  edge: number;
  /** Optional cursor light: the opacity it lifts the pattern to under the pointer (0 to 1). */
  spot?: number;
  /** Radius of the cursor light, in px. */
  radius?: number;
};

/**
 * Works out how to draw a pattern with a radial fade and, optionally, a cursor light.
 *
 * One element carries one opacity, so it takes the strongest value any layer needs, and a
 * mask scales it back down wherever less is wanted:
 *   - the fade: `centre` at the focus easing to `edge` at the corner;
 *   - the cursor light: a soft circle at the pointer that is as strong as `spot`.
 * The two soft shapes are listed as two mask layers, which add together, so under the
 * pointer the pattern reaches `spot` (or stays where it was if that is already stronger).
 * The light follows two CSS variables, --mx and --my (its position) and --spot (0 to 1,
 * how much of it is showing), so moving it never re-renders anything.
 */
export function patternLayers(f: PatternFade) {
  const spot = f.spot ?? 0;
  const top = Math.max(f.centre, f.edge, spot);
  const centreAlpha = f.centre / top;
  const edgeAlpha = f.edge / top;
  const spotAlpha = spot / top;

  const fade = `radial-gradient(${f.shape} farthest-corner at ${f.focus}, rgba(0, 0, 0, ${centreAlpha}) 0%, rgba(0, 0, 0, ${edgeAlpha}) 100%)`;
  let mask = fade;
  if (spot > 0) {
    const r = f.radius ?? 190;
    // Eased falloff, so the edge of the light is soft rather than a visible ring.
    const stops = [
      [1, 0],
      [0.72, 35],
      [0.3, 70],
      [0, 100],
    ]
      .map(([k, at]) => `rgba(0, 0, 0, calc(var(--spot, 0) * ${+(spotAlpha * k).toFixed(4)})) ${at}%`)
      .join(', ');
    mask = `radial-gradient(circle ${r}px at var(--mx, -999px) var(--my, -999px), ${stops}), ${fade}`;
  }
  return { opacity: top, mask, centreAlpha, edgeAlpha, spotAlpha };
}
