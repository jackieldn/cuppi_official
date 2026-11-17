// Reading what a person typed into a calculator, and saying in plain words what is wrong with it.
// Pure functions. Imports use the .ts extension so the unit tests can load them from Node.

import { parseNumber, plainNumber } from './format.ts';

export type Read = { value: number; error: string | null };

/**
 * The number in a box, or an error to show under it. `label` finishes the sentences ("the mortgage amount"):
 * "Enter the mortgage amount.", "The mortgage amount should be at least 1."
 */
export function readNumber(text: string, o: { label: string; min?: number; max?: number; integer?: boolean }): Read {
  const label = o.label;
  const sentence = label.charAt(0).toUpperCase() + label.slice(1);
  if (text.trim() === '') return { value: NaN, error: `Enter ${label}.` };
  const value = parseNumber(text);
  if (!Number.isFinite(value)) return { value: NaN, error: `${sentence} should be a number, like 250,000.` };
  if (o.integer && !Number.isInteger(value)) return { value: NaN, error: `${sentence} should be a whole number.` };
  if (o.min !== undefined && value < o.min) return { value: NaN, error: `${sentence} should be at least ${plainNumber(o.min)}.` };
  if (o.max !== undefined && value > o.max) return { value: NaN, error: `${sentence} should be no more than ${plainNumber(o.max)}.` };
  return { value, error: null };
}

/** Every error among some reads, without repeats. */
export const problemsOf = (...reads: (Read | null)[]): string[] => [...new Set(reads.flatMap((r) => (r?.error ? [r.error] : [])))];
