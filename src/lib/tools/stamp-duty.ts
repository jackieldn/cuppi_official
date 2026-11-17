// Stamp Duty (England and Northern Ireland), LBTT (Scotland) and LTT (Wales) on a home. Each is charged in
// slices: only the part of the price inside a band pays that band's rate. The bands are in rates.ts.
//
// Pure functions. Imports use the .ts extension so the unit tests can load them from Node.

import { PROPERTY_TAX, type Band, type Region } from './rates.ts';

export type BuyerType = 'standard' | 'first-time' | 'additional';

export type StampDutyInput = {
  price: number;
  region: Region;
  buyer: BuyerType;
  /** England and Northern Ireland only: a buyer who has not lived in the UK enough of the last two years pays 2 percentage points more. */
  nonUkResident?: boolean;
};

export type BandLine = {
  from: number;
  /** null for the top band ("and above"). */
  to: number | null;
  /** The rate charged on this slice, including any extra points for an additional home or non-UK resident. */
  rate: number;
  /** How much of the price falls in this slice. */
  inBand: number;
  tax: number;
};

export type StampDutyResult = {
  /** The total, to the pound below (the tax authorities round down). */
  tax: number;
  /** The tax as a share of the price, in per cent. */
  effectiveRate: number;
  taxName: string;
  taxShort: string;
  bands: BandLine[];
  /** A charge on the whole price on top of the bands (Scotland's Additional Dwelling Supplement). */
  supplement: { label: string; rate: number; amount: number } | null;
  /** Which kind of relief or surcharge was applied, in plain words. */
  applied: string[];
  /** Things the person should know about this result. */
  notes: string[];
};

const EPSILON = 1e-9;

/** The slices of `price` under a set of bands, with `extraPoints` added to each rate. Slices the price does not reach are left out. */
export function taxByBands(price: number, bands: Band[], extraPoints = 0): BandLine[] {
  const lines: BandLine[] = [];
  let from = 0;
  for (const band of bands) {
    const ceiling = band.upTo ?? Infinity;
    const inBand = Math.min(price, ceiling) - from;
    if (inBand <= 0) break;
    const rate = band.rate + extraPoints;
    lines.push({ from, to: band.upTo, rate, inBand, tax: (inBand * rate) / 100 });
    from = ceiling;
  }
  return lines;
}

export function calculateStampDuty(input: StampDutyInput): StampDutyResult {
  const rules = PROPERTY_TAX[input.region];
  const price = Number.isFinite(input.price) ? Math.max(0, input.price) : 0;
  const applied: string[] = [];
  const notes: string[] = [];

  let bands: Band[] = rules.standard;
  let extraPoints = 0;
  let supplement: StampDutyResult['supplement'] = null;

  if (input.buyer === 'first-time') {
    if (!rules.firstTime) {
      notes.push(`${rules.short} has no first-time buyer relief, so the usual rates apply.`);
    } else if (rules.firstTime.maxPrice !== null && price > rules.firstTime.maxPrice) {
      notes.push(`First-time buyer relief is lost completely above ${poundsText(rules.firstTime.maxPrice)}, so the usual rates apply to the whole price.`);
    } else {
      bands = rules.firstTime.bands;
      applied.push('First-time buyer relief');
    }
  }

  if (input.buyer === 'additional') {
    const { minPrice, how } = rules.additional;
    if (price < minPrice) {
      notes.push(`The higher rates only apply to a purchase of ${poundsText(minPrice)} or more, so the usual rates apply.`);
    } else if (how.kind === 'extra-points') {
      extraPoints += how.points;
      applied.push(`Higher rates for an additional home (+${how.points}% on every band)`);
    } else if (how.kind === 'own-bands') {
      bands = how.bands;
      applied.push('Higher rates for an additional home');
    } else {
      supplement = { label: how.label, rate: how.rate, amount: (price * how.rate) / 100 };
      applied.push(`${how.label} (${how.rate}% of the whole price)`);
    }
  }

  if (input.nonUkResident && rules.nonUkResidentPoints) {
    extraPoints += rules.nonUkResidentPoints;
    applied.push(`Non-UK resident surcharge (+${rules.nonUkResidentPoints}%)`);
  }

  const lines = taxByBands(price, bands, extraPoints);
  const exact = lines.reduce((sum, l) => sum + l.tax, 0) + (supplement?.amount ?? 0);
  const tax = Math.floor(exact + EPSILON);

  return {
    tax,
    effectiveRate: price > 0 ? (tax / price) * 100 : 0,
    taxName: rules.name,
    taxShort: rules.short,
    bands: lines,
    supplement,
    applied,
    notes,
  };
}

function poundsText(n: number): string {
  return `£${n.toLocaleString('en-GB')}`;
}
