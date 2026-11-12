import { PATTERN_DEFAULTS, PATTERNS, patternLayers, type PatternName } from '@/lib/patterns';

/** The pattern's address: a name from PATTERNS, or a path. */
export function patternUrl(pattern: PatternName | string): string {
  return pattern in PATTERNS ? PATTERNS[pattern as PatternName] : pattern;
}

/**
 * A pattern laid over a colour block. Put it inside a `relative overflow-hidden` parent,
 * as the first child, and make the content after it `relative` so it stays on top.
 *
 * Opacity eases from `centre` at `focus` to `edge` at the farthest corner, and either can
 * be the stronger. The house look is quiet in the middle and fuller at the edges, so the
 * thing you want looked at (a phone, a search box) sits in a calm patch.
 * `shape="ellipse"` stretches the fade to the block's proportions, for wide blocks with
 * the content in the middle. For a pattern that also lights up under the cursor, see
 * SpotlightPattern.
 */
export function PatternOverlay({
  pattern,
  focus,
  shape = 'circle',
  size = PATTERN_DEFAULTS.size,
  centre = PATTERN_DEFAULTS.centre,
  edge = PATTERN_DEFAULTS.edge,
}: {
  pattern: PatternName | string;
  focus: string;
  shape?: 'circle' | 'ellipse';
  size?: number;
  centre?: number;
  edge?: number;
}) {
  const { opacity, mask } = patternLayers({ shape, focus, centre, edge });
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0"
      style={{
        backgroundImage: `url(${patternUrl(pattern)})`,
        backgroundSize: `${size}px`,
        backgroundRepeat: 'repeat',
        opacity,
        WebkitMaskImage: mask,
        maskImage: mask,
      }}
    />
  );
}
