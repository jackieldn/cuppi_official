// Picking out the best of several figures, for the comparison table. Pure function, no imports.

/**
 * The positions of the best values, when there is more than one to choose between. `lowest` (the default) picks the
 * smallest, `highest` the largest. Values within `tolerance` of the best share it, and when they all do, or there is only
 * one, nothing is singled out.
 */
export function bestIndexes(values: number[], mode: 'lowest' | 'highest' = 'lowest', tolerance = 0.5): Set<number> {
  if (values.length < 2) return new Set();
  const target = mode === 'lowest' ? Math.min(...values) : Math.max(...values);
  const best = new Set<number>();
  values.forEach((v, i) => {
    if (Math.abs(v - target) <= tolerance) best.add(i);
  });
  return best.size === values.length ? new Set() : best;
}
