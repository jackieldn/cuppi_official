// The comparison page (/compare): how Cuppi's features compare with Hartley and FamilyWall.
//
// Everything said about another app lives here, next to where it came from. A cell for a rival that
// says anything (a tick, a dash, some words) names its sources, and every source has a date it was
// checked, so the page can always show where a claim came from and how old it is. A cell that has not
// been checked in the app yet is `tbc` and shows as "To confirm" until someone has. Cuppi's own prices
// are not kept here: the page reads them from the Plans settings, so the two always agree.
//
// Facts were gathered on 19 Nov 2026 from each app's UK App Store page, website, privacy policy and
// terms, and from Companies House. See docs/competitor-research-hartley-familywall.md.

export type AppId = 'cuppi' | 'hartley' | 'familywall';
export const APP_IDS: AppId[] = ['cuppi', 'hartley', 'familywall'];
export const RIVALS: AppId[] = ['hartley', 'familywall'];

export const APP_NAMES: Record<AppId, string> = { cuppi: 'Cuppi Home', hartley: 'Hartley', familywall: 'FamilyWall' };

/** When the facts on the page were last checked against their sources. Update it with them. */
export const CHECKED_ON = '2026-11-19';
export const CHECKED_ON_LABEL = '19 Nov 2026';

// ---------------------------------------------------------------------------
// Sources
// ---------------------------------------------------------------------------

export type Source = {
  id: string;
  label: string;
  /** Where to read it. Absent for what the team saw for itself (a test of the app), which has no page to point to. */
  url?: string;
  /** ISO date (YYYY-MM-DD) it was last checked. */
  checkedOn: string;
};

export const SOURCES: Source[] = [
  { id: 'cuppi-store', label: 'Cuppi Home, UK App Store listing', url: 'https://apps.apple.com/gb/app/cuppi/id6754384902', checkedOn: CHECKED_ON },
  { id: 'hartley-store', label: 'Hartley, UK App Store listing', url: 'https://apps.apple.com/gb/app/hartley-home-management-app/id6751110777', checkedOn: CHECKED_ON },
  { id: 'hartley-site', label: 'Hartley website and FAQ', url: 'https://www.hellohartley.co.uk', checkedOn: CHECKED_ON },
  { id: 'hartley-how', label: 'Hartley, how it works', url: 'https://www.hellohartley.co.uk/product', checkedOn: CHECKED_ON },
  { id: 'hartley-privacy', label: 'Hartley privacy policy', url: 'https://www.hellohartley.co.uk/privacy-policy', checkedOn: CHECKED_ON },
  { id: 'hartley-terms', label: 'Hartley terms and conditions', url: 'https://www.hellohartley.co.uk/terms-conditions', checkedOn: CHECKED_ON },
  { id: 'hartley-owner', label: 'Companies House: Hartley Technology Limited, persons with significant control', url: 'https://find-and-update.company-information.service.gov.uk/company/16471418/persons-with-significant-control', checkedOn: CHECKED_ON },
  { id: 'fw-store', label: 'FamilyWall, UK App Store listing', url: 'https://apps.apple.com/gb/app/familywall-family-organizer/id496889629', checkedOn: CHECKED_ON },
  { id: 'fw-site', label: 'FamilyWall website', url: 'https://www.familywall.com', checkedOn: CHECKED_ON },
  { id: 'fw-premium', label: 'FamilyWall Premium plans', url: 'https://www.familywall.com/premium.html', checkedOn: CHECKED_ON },
  { id: 'fw-privacy', label: 'FamilyWall privacy policy', url: 'https://www.familywall.com/privacy.html', checkedOn: CHECKED_ON },
  { id: 'fw-terms', label: 'FamilyWall terms of use', url: 'https://www.familywall.com/terms.html', checkedOn: CHECKED_ON },
  { id: 'team-test', label: 'Tested by the Cuppi team in the app', checkedOn: CHECKED_ON },
];

export const sourceById = (id: string): Source | undefined => SOURCES.find((s) => s.id === id);

// ---------------------------------------------------------------------------
// The feature matrix
// ---------------------------------------------------------------------------

/** What a cell says: it has it (with an optional note), it has not, a few words, or "not checked in the app yet". */
export type Cell = {
  kind: 'yes' | 'no' | 'text' | 'tbc';
  /** A tick's small note ("Premium only"), or the words of a text cell. */
  text?: string;
  /** A text cell that is good news (such as "None" for ads) and is highlighted like a tick. */
  good?: boolean;
};

/** Whether the page highlights a cell: it has a tick, or its words are good news. */
export const isHighlighted = (cell: Cell): boolean => cell.kind === 'yes' || (cell.kind === 'text' && !!cell.good);

const yes = (text?: string): Cell => ({ kind: 'yes', ...(text ? { text } : {}) });
const no = (): Cell => ({ kind: 'no' });
const words = (text: string, good?: boolean): Cell => ({ kind: 'text', text, ...(good ? { good } : {}) });
const tbc = (text?: string): Cell => ({ kind: 'tbc', ...(text ? { text } : {}) });

export type FactRow = {
  id: string;
  /** What the row is about. */
  label: string;
  /** What Cuppi does, in a line under the label. */
  detail?: string;
  cells: Record<AppId, Cell>;
  /** The sources behind each rival's cell. Cuppi's own cells need none. */
  sources: Partial<Record<AppId, string[]>>;
};

export type FactGroup = { id: string; title: string; rows: FactRow[] };

export const FACT_GROUPS: FactGroup[] = [
  {
    id: 'home',
    title: 'Everyday home life',
    rows: [
      {
        id: 'chores',
        label: 'Chores',
        detail: 'Create to-do lists and assign tasks.',
        cells: { cuppi: yes(), hartley: yes('Called Activity'), familywall: yes('Called Lists') },
        sources: { hartley: ['team-test'], familywall: ['fw-store', 'team-test'] },
      },
      {
        id: 'celebrations',
        label: 'Celebrations',
        detail: 'Birthdays, anniversaries, bank holidays and In Memoriam.',
        cells: { cuppi: yes(), hartley: no(), familywall: yes('Called Special days, Premium only') },
        sources: { hartley: ['team-test'], familywall: ['team-test'] },
      },
      {
        id: 'pets',
        label: 'Pets',
        detail: 'Vaccines, medication and doses, vet, weight, insurance, microchip.',
        cells: { cuppi: yes(), hartley: yes(), familywall: no() },
        sources: { hartley: ['team-test'], familywall: ['fw-store', 'team-test'] },
      },
      {
        id: 'shopping',
        label: 'Shopping lists',
        detail: 'Live shopping mode, lists split between people, sorted by aisle.',
        cells: { cuppi: yes(), hartley: no(), familywall: yes() },
        sources: { hartley: ['hartley-store'], familywall: ['fw-store', 'team-test'] },
      },
      {
        id: 'bins',
        label: 'Bin day',
        detail: 'Your council’s collection dates, with a nudge the evening before.',
        cells: { cuppi: yes(), hartley: no(), familywall: no() },
        sources: { hartley: ['hartley-store'], familywall: ['fw-store'] },
      },
    ],
  },
  {
    id: 'money',
    title: 'Money and the car',
    rows: [
      {
        id: 'budget',
        label: 'Budget',
        detail: 'Renews itself each month, with who-pays-what splits and a payday countdown.',
        cells: { cuppi: yes(), hartley: words('Reminders to find better deals'), familywall: yes('Premium only') },
        sources: { hartley: ['team-test', 'hartley-how'], familywall: ['fw-store', 'fw-premium'] },
      },
      {
        id: 'receipts',
        label: 'Receipts',
        detail: 'Scanned, itemised, searchable, with a spending tracker.',
        cells: { cuppi: yes(), hartley: words('Stored as documents'), familywall: words('Stored as documents, Premium only') },
        sources: { hartley: ['hartley-how'], familywall: ['team-test', 'fw-store'] },
      },
      {
        id: 'car',
        label: 'Car',
        detail: 'MOT, tax and insurance from the DVSA, running costs, tyres, warranties.',
        cells: { cuppi: yes(), hartley: yes('Called Garage, reminders only'), familywall: no() },
        sources: { hartley: ['team-test', 'hartley-store'], familywall: ['fw-store'] },
      },
    ],
  },
  {
    id: 'family',
    title: 'Family, safety and what pays for it',
    rows: [
      {
        id: 'children',
        label: 'Child accounts',
        detail: 'Restricted by default, with parent-supervised email and password changes.',
        cells: { cuppi: yes(), hartley: no(), familywall: yes() },
        sources: { hartley: ['team-test'], familywall: ['team-test'] },
      },
      {
        id: 'security',
        label: 'Sign-in security',
        detail: 'Face ID or Touch ID, two-step verification and a sensitive-activity log.',
        cells: { cuppi: yes(), hartley: yes(), familywall: yes() },
        sources: { hartley: ['hartley-privacy'], familywall: ['team-test'] },
      },
      {
        id: 'promotion',
        label: 'Paid promotion in the app',
        cells: { cuppi: words('None', true), hartley: words('Trader and switching suggestions, paid by commission'), familywall: words('Ads on the free plan') },
        sources: { hartley: ['hartley-site', 'hartley-terms'], familywall: ['fw-premium', 'fw-terms'] },
      },
    ],
  },
  {
    id: 'platforms',
    title: 'Phones',
    rows: [
      {
        id: 'ios',
        label: 'Built for iPhone',
        cells: { cuppi: words('iOS 26 and later'), hartley: words('iOS 16.4 and later'), familywall: words('iOS 17 and later') },
        sources: { hartley: ['hartley-store'], familywall: ['fw-store'] },
      },
      {
        id: 'android',
        label: 'Android',
        cells: { cuppi: no(), hartley: yes(), familywall: yes() },
        sources: { hartley: ['hartley-site'], familywall: ['fw-site'] },
      },
    ],
  },
];

/**
 * The small print about the in-app checks (the source called "Tested by the Cuppi team in the app"), shown at the foot of the
 * page. It says what a test is and that it can go out of date, without claiming more than the team did.
 */
export const TEST_NOTE =
  'Where a claim is marked as tested, the Cuppi team used that app itself and recorded what it found on the date shown. Apps change as they update, so what we saw may not match what you see later.';

/** One honest line under the matrix: what Cuppi does not do. */
export const NOT_YET =
  'Cuppi doesn’t have a shared calendar, location sharing or a documents vault, and it isn’t on Android yet.';

// ---------------------------------------------------------------------------
// Your data
// ---------------------------------------------------------------------------

export type DataPanel = {
  /** What the App Store label lists as "used to track you". Empty for none. */
  tracking: string[];
  /** The identifiers the policy names, in a line each. */
  identifiers: string[];
  /** Linked to your identity, per the label. */
  linked: string[];
  /** Collected but not linked to your identity, per the label. */
  notLinked: string[];
  /** A line of context, such as who owns the company. */
  note?: string;
  sources: string[];
};

export const DATA_PANELS: Record<AppId, DataPanel> = {
  cuppi: {
    tracking: [],
    identifiers: [],
    linked: ['Purchases', 'Financial info', 'Location', 'Contact info', 'User content', 'Identifiers'],
    notLinked: ['Usage data'],
    note: 'Apple counts anything you save in your account as linked to you. Cuppi doesn’t use it for ads or tracking.',
    sources: ['cuppi-store'],
  },
  hartley: {
    tracking: ['Contact info', 'User content', 'Identifiers', 'Usage data'],
    identifiers: ['Device ad IDs (IDFA and AAID), shared with AppsFlyer, PostHog, Firebase, Meta, Google and Apple'],
    linked: ['Contact info', 'User content', 'Identifiers', 'Usage data'],
    notLinked: ['Usage data', 'Diagnostics', 'Other data'],
    note: 'Hartley Technology Limited is controlled by Yell Holdco Limited, per Companies House. Its FAQ says it may earn a small commission when you connect with local experts or switch providers.',
    sources: ['hartley-store', 'hartley-privacy', 'hartley-owner', 'hartley-site'],
  },
  familywall: {
    tracking: ['Identifiers'],
    identifiers: ['Ad ID, IDFA and Google Advertising ID'],
    linked: ['Email and name', 'User ID', 'Crash data'],
    notLinked: ['Device ID', 'Product interaction', 'Other usage data', 'Performance data', 'Other diagnostic data'],
    note: 'Its listing says the app may use your location even when it isn’t open.',
    sources: ['fw-store', 'fw-privacy'],
  },
};

// ---------------------------------------------------------------------------
// Price
// ---------------------------------------------------------------------------

/** What each rival costs a month, in pounds, and how it pays its way. Cuppi's price comes from the Plans settings. */
export const RIVAL_PRICES: Record<'hartley' | 'familywall', { monthly: number; label: string; funding: string; sources: string[] }> = {
  hartley: { monthly: 0, label: '£0', funding: 'Free. Earns commission on trader and provider suggestions.', sources: ['hartley-site', 'hartley-terms'] },
  familywall: { monthly: 5.99, label: '£5.99', funding: 'Limited free with ads, or Premium at £5.99 a month.', sources: ['fw-store', 'fw-premium'] },
};

/** What the free trial gives, as Cuppi offers it. */
export const CUPPI_TRIAL = '1 month free trial for new users, 2 months free with an invite code.';

/** "£59.90" -> 59.9. Anything it cannot read gives undefined, and the page leaves that bar out. */
export function parsePounds(text: string): number | undefined {
  const m = /(\d+(?:[.,]\d+)?)/.exec(text.replace(/,(?=\d{3}\b)/g, ''));
  if (!m) return undefined;
  const n = Number(m[1].replace(',', '.'));
  return Number.isFinite(n) ? n : undefined;
}

/**
 * Each source's number, in the order the page first cites it (the matrix, then the data panels, then the prices), so the
 * small numbers beside a claim and the list at the foot of the page agree. A source never cited has no number.
 */
export function numberSources(): Map<string, number> {
  const numbers = new Map<string, number>();
  const see = (ids: string[] = []) => ids.forEach((id) => numbers.has(id) || numbers.set(id, numbers.size + 1));
  for (const g of FACT_GROUPS) for (const r of g.rows) for (const app of RIVALS) see(r.sources[app]);
  for (const app of APP_IDS) see(DATA_PANELS[app].sources);
  see(RIVAL_PRICES.hartley.sources);
  see(RIVAL_PRICES.familywall.sources);
  return numbers;
}

// ---------------------------------------------------------------------------
// Why Cuppi, and the screenshots
// ---------------------------------------------------------------------------

export type Reason = { id: string; title: string; text: string; tint: 'clay' | 'moss' | 'sky' | 'honey'; icon: 'home' | 'shield' | 'phone' | 'map' };

/** A few lines under "Why Cuppi": who makes it, and why it is made this way. */
export const WHY_INTRO =
  'Cuppi is made by an independent developer studio, and we take real pride in what we build. We do things our own way, and we stand up, fiercely, against the big-tech way of doing them.';

export const REASONS: Reason[] = [
  { id: 'whole-home', title: 'The whole home', text: 'Celebrations, chores, pets, shopping, budget, car and bins in one app.', tint: 'clay', icon: 'home' },
  { id: 'no-tracking', title: 'No ads, no tracking', text: 'Your home is not our business.', tint: 'moss', icon: 'shield' },
  { id: 'made-for-iphone', title: 'Made for iPhone', text: 'Designed with care, with the latest features in mind.', tint: 'sky', icon: 'phone' },
  { id: 'made-for-uk', title: 'Made for the UK', text: 'From supermarkets to bin days, we built Cuppi for Britain.', tint: 'honey', icon: 'map' },
];

export type Shot = { src: string; width: number; height: number; alt: string };

/**
 * Two screenshots per app, as files under public/images/compare. Add them here (width and height are the image's own)
 * and the page shows them; until then it shows an empty frame. Rival shots are the team's own captures with the date.
 */
export const SHOTS: Record<AppId, Shot[]> = {
  cuppi: [],
  hartley: [],
  familywall: [],
};
