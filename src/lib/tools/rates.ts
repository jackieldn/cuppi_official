// The numbers that change when the law does. Everything a calculator takes from the tax rules lives here,
// each set with the date it was last checked against the official pages, so a change is made in one place and
// the date shown on the page moves with it.
//
// WHEN THIS GOES STALE: the Budget (usually autumn, sometimes spring) and 1 April are when property taxes
// change. After each, check the three official pages named below, update the bands, and set `reviewed`.
// The unit tests (tests/unit/stamp-duty.test.mjs) pin the published bands, so a changed number fails a test
// until the matching expectation is changed on purpose.
//
// No imports from the app, so the unit tests can load this from Node.

/** A slice of the price taxed at one rate. `upTo` is the top of the slice in pounds (null means "and above"). */
export type Band = { upTo: number | null; rate: number };

export type Region = 'england' | 'scotland' | 'wales';

export type PropertyTaxRules = {
  /** What the tax is called, in full and short. */
  name: string;
  short: string;
  /** Who collects it. */
  authority: string;
  /** The official page the numbers come from. */
  source: string;
  /** When these numbers were last checked against it (YYYY-MM-DD). */
  reviewed: string;
  /** The usual rates for a home bought to live in. */
  standard: Band[];
  /** Relief for someone buying their first home. null where there is none. */
  firstTime: { bands: Band[]; /** Above this price the relief is lost completely. null means no limit. */ maxPrice: number | null } | null;
  /** What buying another home on top of the one you own costs. */
  additional: {
    /** Below this price it does not apply. */
    minPrice: number;
    how:
      | { kind: 'extra-points'; points: number } // these many percentage points on every band
      | { kind: 'own-bands'; bands: Band[] } // a table of its own
      | { kind: 'flat-on-price'; rate: number; label: string }; // a percentage of the whole price, on top
  };
  /** The extra for people who do not live in the UK (England and Northern Ireland only). */
  nonUkResidentPoints: number | null;
};

export const PROPERTY_TAX: Record<Region, PropertyTaxRules> = {
  england: {
    name: 'Stamp Duty Land Tax',
    short: 'SDLT',
    authority: 'HMRC',
    source: 'https://www.gov.uk/stamp-duty-land-tax/residential-property-rates',
    reviewed: '2026-11-17',
    // From 1 April 2025.
    standard: [
      { upTo: 125_000, rate: 0 },
      { upTo: 250_000, rate: 2 },
      { upTo: 925_000, rate: 5 },
      { upTo: 1_500_000, rate: 10 },
      { upTo: null, rate: 12 },
    ],
    firstTime: {
      maxPrice: 500_000,
      bands: [
        { upTo: 300_000, rate: 0 },
        { upTo: 500_000, rate: 5 },
      ],
    },
    // Since 31 October 2024: 5 percentage points on every band, for a purchase of £40,000 or more.
    additional: { minPrice: 40_000, how: { kind: 'extra-points', points: 5 } },
    nonUkResidentPoints: 2,
  },
  scotland: {
    name: 'Land and Buildings Transaction Tax',
    short: 'LBTT',
    authority: 'Revenue Scotland',
    source: 'https://revenue.scot/taxes/land-buildings-transaction-tax',
    reviewed: '2026-11-17',
    standard: [
      { upTo: 145_000, rate: 0 },
      { upTo: 250_000, rate: 2 },
      { upTo: 325_000, rate: 5 },
      { upTo: 750_000, rate: 10 },
      { upTo: null, rate: 12 },
    ],
    // The nil-rate band rises from £145,000 to £175,000; the rest is unchanged.
    firstTime: {
      maxPrice: null,
      bands: [
        { upTo: 175_000, rate: 0 },
        { upTo: 250_000, rate: 2 },
        { upTo: 325_000, rate: 5 },
        { upTo: 750_000, rate: 10 },
        { upTo: null, rate: 12 },
      ],
    },
    // The Additional Dwelling Supplement: 8% of the whole price (since 5 December 2024), for a purchase of £40,000 or more.
    additional: { minPrice: 40_000, how: { kind: 'flat-on-price', rate: 8, label: 'Additional Dwelling Supplement' } },
    nonUkResidentPoints: null,
  },
  wales: {
    name: 'Land Transaction Tax',
    short: 'LTT',
    authority: 'the Welsh Revenue Authority',
    source: 'https://www.gov.wales/land-transaction-tax-rates-and-bands',
    reviewed: '2026-11-17',
    standard: [
      { upTo: 225_000, rate: 0 },
      { upTo: 400_000, rate: 6 },
      { upTo: 750_000, rate: 7.5 },
      { upTo: 1_500_000, rate: 10 },
      { upTo: null, rate: 12 },
    ],
    firstTime: null,
    // The "higher residential rates" (since 11 December 2024), for a purchase of £40,000 or more.
    additional: {
      minPrice: 40_000,
      how: {
        kind: 'own-bands',
        bands: [
          { upTo: 180_000, rate: 5 },
          { upTo: 250_000, rate: 8.5 },
          { upTo: 400_000, rate: 10 },
          { upTo: 750_000, rate: 12.5 },
          { upTo: 1_500_000, rate: 15 },
          { upTo: null, rate: 17 },
        ],
      },
    },
    nonUkResidentPoints: null,
  },
};

/** How many income multiples lenders commonly use, lowest to highest. A guide, not a rule: each lender sets its own. */
export const INCOME_MULTIPLES = [4, 4.5, 5, 5.5] as const;
/** The scale people can drag across for "times income": some lenders go well past the usual range for high earners. */
export const INCOME_MULTIPLE_SCALE = { min: 4, max: 7, step: 0.5 } as const;

/** The earliest `reviewed` date of all the rate sets, for the "rates checked" line on the pages and in the admin. */
export function oldestReview(): string {
  return Object.values(PROPERTY_TAX)
    .map((r) => r.reviewed)
    .sort()[0];
}
