// Small helpers the calculators share. Pure functions with no imports from the app, so the unit tests can load them from Node.

const WHOLE = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 });
const PENCE = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', minimumFractionDigits: 2, maximumFractionDigits: 2 });
const PLAIN = new Intl.NumberFormat('en-GB', { maximumFractionDigits: 2 });

/** £1,234 (whole pounds by default); `pence: true` gives £1,234.56. A non-number gives a dash. */
export function gbp(value: number, options: { pence?: boolean } = {}): string {
  if (!Number.isFinite(value)) return '–';
  return (options.pence ? PENCE : WHOLE).format(value);
}

/** 1,234.5 with no currency sign. */
export const plainNumber = (value: number): string => (Number.isFinite(value) ? PLAIN.format(value) : '–');

/** 30.014 -> "30%", 89.44 -> "89.4%": one decimal place, for shares and ratios. */
export const share = (value: number): string => (Number.isFinite(value) ? `${Number(value.toFixed(1))}%` : '–');

/** 4.5 -> "4.5%". Whole numbers lose the decimal point; up to two decimals are kept. */
export const percent = (value: number): string => (Number.isFinite(value) ? `${Number(value.toFixed(2))}%` : '–');

/**
 * What a person typed into a number box -> the number, or NaN when it is empty or not a number.
 * Commas, spaces and a leading £ are ignored, so "£250,000" and "250000" are the same.
 */
export function parseNumber(text: string): number {
  const cleaned = text.replace(/[£,\s]/g, '');
  if (cleaned === '' || !/^-?\d*\.?\d+$|^-?\d+\.$/.test(cleaned)) return NaN;
  return Number(cleaned);
}

/** 250000 -> "250,000" for a money box that has just lost focus. Anything that is not a number is returned as typed. */
export function tidyNumberText(text: string): string {
  const n = parseNumber(text);
  if (!Number.isFinite(n)) return text;
  return PLAIN.format(n);
}

/** 303 -> "25 years 3 months"; 12 -> "1 year"; 5 -> "5 months"; 0 -> "0 months". */
export function monthsToText(months: number): string {
  if (!Number.isFinite(months) || months < 0) return '–';
  const m = Math.round(months);
  const years = Math.floor(m / 12);
  const rest = m % 12;
  const y = years ? `${years} year${years === 1 ? '' : 's'}` : '';
  const r = rest || !years ? `${rest} month${rest === 1 ? '' : 's'}` : '';
  return [y, r].filter(Boolean).join(' ');
}

/** The month and year `months` from `from`, e.g. "March 2041". */
export function monthYearAfter(from: Date, months: number): string {
  const d = new Date(from.getFullYear(), from.getMonth() + Math.round(months), 1);
  return d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
}

/** What a box of years is as a whole number of months: "5" -> 60, "2.5" -> 30. Blank, zero or anything else is 0 (no limit). */
export function yearsToMonths(text: string): number {
  const n = parseNumber(text);
  return Number.isFinite(n) && n > 0 ? Math.round(n * 12) : 0;
}
