// Helpers for the charts. Pure functions with no imports, so the unit tests can load them from Node.

/** A round step for an axis: 1, 2, 2.5 or 5 times a power of ten, giving about `ticks` steps up to `max`. */
export function niceStep(max: number, ticks: number): number {
  const raw = Math.max(max, 1e-9) / ticks;
  const pow = Math.pow(10, Math.floor(Math.log10(raw)));
  const f = raw / pow;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * pow;
}

/**
 * The balance at `samples` evenly spaced moments from month 0 to `months`, whatever the series' own length: a line
 * that ends early (a mortgage cleared sooner) stays at its last value (nothing owed). Always the same number of
 * values, so one chart can morph into another by moving each value from where it was to where it is now.
 * `points` are monthly, starting at month 0.
 */
export function resampleBalance(points: { month: number; balance: number }[], months: number, samples: number): number[] {
  const last = points.length - 1;
  if (last < 0) return Array.from({ length: samples }, () => 0);
  return Array.from({ length: samples }, (_, i) => {
    const m = samples > 1 ? (i / (samples - 1)) * months : 0;
    const k = Math.min(last, Math.floor(m));
    const a = points[k].balance;
    const b = points[Math.min(last, k + 1)].balance;
    return a + (b - a) * (m - k);
  });
}
