// The Cuppi Home Tools: free calculators for UK home life. This is the list of what exists (code, not
// content: each one needs a calculator written for it). What the admin controls for each tool (live, in the
// menu, its tile colour and icon, the order) is in settings.ts and is stored in the database.
//
// Type-only imports, so the unit tests can load this from Node.

import type { FeatureTint, TileColour } from '../features-types.ts';

export type ToolGroup = 'mortgage' | 'buying' | 'borrowing';

/** The little picture on a tool's tile until the admin uploads an icon of their own. Drawn from lucide in tool-tile.tsx. */
export type ToolGlyph = 'calculator' | 'piggy-bank' | 'landmark' | 'key-round' | 'hand-coins';

export type ToolDef = {
  /** The web address: /tools/{slug}. Named for what people search for. */
  slug: string;
  name: string;
  /** One line under the name, on cards and in the menu. */
  tagline: string;
  group: ToolGroup;
  glyph: ToolGlyph;
  /** The colour of the page's top block. */
  tint: FeatureTint;
  /** The colour of the tile, until the admin picks another. */
  tile: TileColour;
  /** The page's title in search results (the site adds " | Cuppi") and its description. */
  seoTitle: string;
  seoDescription: string;
};

export const GROUP_LABELS: Record<ToolGroup, { title: string; blurb: string }> = {
  mortgage: { title: 'Your mortgage', blurb: 'See what a mortgage costs each month, and what paying it off sooner is worth.' },
  buying: { title: 'Buying a home', blurb: 'The tax on a purchase, and a sense of how much you could borrow.' },
  borrowing: { title: 'Loans', blurb: 'What a loan costs, and what repaying it early saves.' },
};

/** The order here is the default order, and the order the groups appear in. */
export const TOOLS: ToolDef[] = [
  {
    slug: 'mortgage-calculator',
    name: 'Mortgage calculator',
    tagline: 'Your monthly payment, and what the mortgage costs in all.',
    group: 'mortgage',
    glyph: 'calculator',
    tint: 'honey',
    tile: 'amber',
    seoTitle: 'Mortgage Calculator UK: Monthly Repayments',
    seoDescription: 'Work out your monthly mortgage payment, the total interest and how it changes if rates rise. Repayment or interest-only, with a year-by-year balance. Free, private, no sign-up.',
  },
  {
    slug: 'mortgage-overpayment-calculator',
    name: 'Mortgage overpayment calculator',
    tagline: 'How much time and interest overpaying could save.',
    group: 'mortgage',
    glyph: 'piggy-bank',
    tint: 'moss',
    tile: 'green',
    seoTitle: 'Mortgage Overpayment Calculator UK',
    seoDescription: 'See how much interest and time you could save by overpaying your mortgage each month or with a lump sum, and whether you stay within a 10% early repayment charge allowance. Free and private.',
  },
  {
    slug: 'stamp-duty-calculator',
    name: 'Stamp Duty calculator',
    tagline: 'Stamp Duty, LBTT or LTT for England, Scotland and Wales.',
    group: 'buying',
    glyph: 'landmark',
    tint: 'sky',
    tile: 'blue',
    seoTitle: 'Stamp Duty Calculator: England, Scotland & Wales',
    seoDescription: 'Work out the Stamp Duty (SDLT), LBTT or LTT on your home, with first-time buyer relief, additional property rates and a band-by-band breakdown. Rates checked against the official pages.',
  },
  {
    slug: 'how-much-can-i-borrow',
    name: 'How much can I borrow?',
    tagline: 'A rule-of-thumb mortgage borrowing estimate from your income.',
    group: 'buying',
    glyph: 'key-round',
    tint: 'clay',
    tile: 'pink',
    seoTitle: 'How Much Can I Borrow for a Mortgage?',
    seoDescription: 'Estimate how much you could borrow for a mortgage from your income and deposit, the most you could pay for a home, and what the monthly payments would be. Free, private, no sign-up.',
  },
  {
    slug: 'loan-repayment-calculator',
    name: 'Loan repayment calculator',
    tagline: 'Monthly payments, and what repaying early saves.',
    group: 'borrowing',
    glyph: 'hand-coins',
    tint: 'lake',
    tile: 'blue',
    seoTitle: 'Loan Repayment Calculator with Early Repayment',
    seoDescription: 'Work out the monthly cost of a personal or car loan, then see what paying extra each month, a lump sum or settling early would save. Free, private, no sign-up.',
  },
];

export const toolBySlug = (slug: string): ToolDef | undefined => TOOLS.find((t) => t.slug === slug);
