// The comparison page (/compare) and its snapshots (/compare/snapshots): how Cuppi's features compare with Hartley and
// FamilyWall. This file holds the SHAPE of that content, the pure helpers that work on it, and the DEFAULT content the
// pages show until the admin saves their own (cuppi_home/compare, read through resolveCompare in compare-settings.ts).
//
// Everything said about another app sits next to where it came from. A cell for a rival that says anything (a tick, a dash,
// some words) names its sources, and every source has the date it was checked, so the page can show where a claim came from
// and how old it is. A cell not yet checked in the app is "tbc" and shows as "To confirm". A claim that rests on the team's
// own testing cites the "Tested by the Cuppi team" source, which links to the snapshots page that shows the proof.
// Cuppi's own price is not kept here: the page reads it from the Plans settings, so the two always agree.
//
// The default facts were gathered on 19 Nov 2026 from each app's UK App Store page, website, privacy policy and terms,
// from Companies House, and from the team's own testing. See docs/competitor-research-hartley-familywall.md.

import type { TileColour } from './features-types.ts';

export type AppId = 'cuppi' | 'hartley' | 'familywall';
export const APP_IDS: AppId[] = ['cuppi', 'hartley', 'familywall'];
export const RIVALS: AppId[] = ['hartley', 'familywall'];

export const APP_NAMES: Record<AppId, string> = { cuppi: 'Cuppi Home', hartley: 'Hartley', familywall: 'FamilyWall' };

/** What the page and the admin hold at most, so a bad document can make the page plainer but never break it. */
export const COMPARE_LIMITS = {
  /** Screenshots per app, on the comparison page and in each snapshot. */
  shots: 3,
  groups: 8,
  rows: 40,
  sources: 40,
  snapshots: 40,
  list: 20,
  short: 80,
  line: 200,
  text: 600,
} as const;

// ---------------------------------------------------------------------------
// Sources
// ---------------------------------------------------------------------------

export type Source = {
  id: string;
  label: string;
  /** Where to read it: https://..., or a page on this site (/compare/snapshots). Absent when there is nothing to point to. */
  url?: string;
  /** ISO date (YYYY-MM-DD) it was last checked. */
  checkedOn: string;
};

/** The one source that stands for the team's own testing; it points at the snapshots page. */
export const TEAM_TEST = 'team-test';
export const SNAPSHOTS_PATH = '/compare/snapshots';

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

// ---------------------------------------------------------------------------
// Your data, price, why Cuppi, screenshots
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

/** What a rival costs a month in pounds, and how it pays its way. Cuppi's price comes from the Plans settings. */
export type RivalPrice = { monthly: number; funding: string; sources: string[] };

/** The line icons a Why Cuppi tile can wear when it has no picture of its own. */
export const REASON_ICONS = ['home', 'shield', 'phone', 'map', 'cake', 'bin', 'paw', 'receipt', 'wallet', 'users', 'star', 'sparkles'] as const;
export type ReasonIcon = (typeof REASON_ICONS)[number];

/**
 * One of the Why Cuppi tiles. Its card colour is fixed (`tint`); its icon is edited like a feature's: a squircle in one of the app's
 * tile colours, wearing a picture (a transparent glyph, `iconUrl`) or, without one, a white line icon.
 */
export type Reason = {
  id: string;
  title: string;
  text: string;
  tint: 'clay' | 'moss' | 'sky' | 'honey';
  tile: TileColour;
  icon: ReasonIcon;
  iconUrl?: string;
};

/** A picture on the site's storage, with its real size so the page can lay it out before it loads. */
export type Shot = { src: string; width: number; height: number; alt: string };

/** What one app showed for a row, in up to three screenshots (a feature can sit behind other screens), and how it was got. */
export type SnapApp = {
  shots: Shot[];
  /** The app's version when the screenshots were taken. */
  version?: string;
  /** The phone, such as "iPhone 16 Pro, iOS 26.1". */
  device?: string;
  /** ISO date the screenshots were taken. */
  testedOn?: string;
  /** One line on what was done to get there. */
  what?: string;
};

/** The proof for one row of the matrix: a few screenshots per app. */
export type Snapshot = { rowId: string; note?: string; apps: Record<AppId, SnapApp> };

export type PrivacyLabels = { tracking: string; identifiers: string; linked: string; notLinked: string; nothing: string };

export type CompareContent = {
  /** ISO date the facts were last checked against their sources. */
  checkedOn: string;
  whyTitle: string;
  whyIntro: string;
  reasons: Reason[];
  /** The headings and lines over the matrix, the prices and the sources. */
  featuresTitle: string;
  featuresIntro: string;
  priceTitle: string;
  priceIntro: string;
  sourcesTitle: string;
  /** The privacy section: its heading and line, and the labels on each card (used to track you, linked, not linked, and "Nothing"). */
  privacyTitle: string;
  privacyIntro: string;
  privacyLabels: PrivacyLabels;
  groups: FactGroup[];
  /** One honest line under the matrix: what Cuppi does not do. */
  notYet: string;
  /** The small print about the team's own testing. */
  testNote: string;
  panels: Record<AppId, DataPanel>;
  prices: Record<'hartley' | 'familywall', RivalPrice>;
  /** What the free trial gives, as Cuppi offers it. */
  trial: string;
  sources: Source[];
  /** The "A look inside" section: whether it shows, its heading and line, and each app's caption ({date} becomes the check date). */
  showLook: boolean;
  lookTitle: string;
  lookIntro: string;
  lookCaptions: Record<AppId, string>;
  /** Up to three screenshots per app, shown in phone frames on the comparison page. */
  shots: Record<AppId, Shot[]>;
  /** The short method note at the top of the snapshots page. */
  snapshotsIntro: string;
  snapshots: Snapshot[];
};

export const emptySnapApp = (): SnapApp => ({ shots: [] });
export const emptySnapshot = (rowId: string): Snapshot => ({ rowId, apps: { cuppi: emptySnapApp(), hartley: emptySnapApp(), familywall: emptySnapApp() } });

/** The content the pages show until something else is saved. A fresh copy each time, so nothing shared can be changed by accident. */
export function defaultCompare(): CompareContent {
  const checkedOn = '2026-11-19';
  const source = (id: string, label: string, url: string | undefined): Source => ({ id, label, ...(url ? { url } : {}), checkedOn });
  return {
    checkedOn,
    whyTitle: 'Why Cuppi',
    whyIntro:
      'Cuppi is made by an independent developer studio, and we take real pride in what we build. We do things our own way, and we stand up, fiercely, against the big-tech way of doing them.',
    reasons: [
      { id: 'whole-home', title: 'The whole home', text: 'Celebrations, chores, pets, shopping, budget, car and bins in one app.', tint: 'clay', tile: 'pink', icon: 'home' },
      { id: 'no-tracking', title: 'No ads, no tracking', text: 'Your home is not our business.', tint: 'moss', tile: 'green', icon: 'shield' },
      { id: 'made-for-iphone', title: 'Made for iPhone', text: 'Designed with care, with the latest features in mind.', tint: 'sky', tile: 'blue', icon: 'phone' },
      { id: 'made-for-uk', title: 'Made for the UK', text: 'From supermarkets to bin days, we built Cuppi for Britain.', tint: 'honey', tile: 'amber', icon: 'map' },
    ],
    featuresTitle: 'Feature by feature',
    featuresIntro: 'What Cuppi does, and what the others say they do.',
    priceTitle: 'What it costs',
    priceIntro: 'A month of each, and how each one pays its way.',
    sourcesTitle: 'Where this comes from',
    privacyTitle: 'Privacy hygiene',
    privacyIntro: 'What each app’s App Store label says it may use to track you, type by type, and what its own policy names.',
    privacyLabels: { tracking: 'Used to track you', identifiers: 'Advertising identifiers named in its policy', linked: 'Linked to you', notLinked: 'Not linked to you', nothing: 'Nothing' },
    groups: [
      {
        id: 'home',
        title: 'Everyday home life',
        rows: [
          {
            id: 'chores',
            label: 'Chores',
            detail: 'Create to-do lists and assign tasks.',
            cells: { cuppi: yes(), hartley: yes('Called Activity'), familywall: yes('Called Lists') },
            sources: { hartley: [TEAM_TEST], familywall: ['fw-store', TEAM_TEST] },
          },
          {
            id: 'celebrations',
            label: 'Celebrations',
            detail: 'Birthdays, anniversaries, bank holidays and In Memoriam.',
            cells: { cuppi: yes(), hartley: no(), familywall: yes('Called Special days, Premium only') },
            sources: { hartley: [TEAM_TEST], familywall: [TEAM_TEST] },
          },
          {
            id: 'pets',
            label: 'Pets',
            detail: 'Vaccines, medication and doses, vet, weight, insurance, microchip.',
            cells: { cuppi: yes(), hartley: yes(), familywall: no() },
            sources: { hartley: [TEAM_TEST], familywall: ['fw-store', TEAM_TEST] },
          },
          {
            id: 'shopping',
            label: 'Shopping lists',
            detail: 'Live shopping mode, lists split between people, sorted by aisle.',
            cells: { cuppi: yes(), hartley: no(), familywall: yes() },
            sources: { hartley: ['hartley-store'], familywall: ['fw-store', TEAM_TEST] },
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
            sources: { hartley: [TEAM_TEST, 'hartley-how'], familywall: ['fw-store', 'fw-premium'] },
          },
          {
            id: 'receipts',
            label: 'Receipts',
            detail: 'Scanned, itemised, searchable, with a spending tracker.',
            cells: { cuppi: yes(), hartley: words('Stored as documents'), familywall: words('Stored as documents, Premium only') },
            sources: { hartley: ['hartley-how'], familywall: [TEAM_TEST, 'fw-store'] },
          },
          {
            id: 'car',
            label: 'Car',
            detail: 'MOT, tax and insurance from the DVSA, running costs, tyres, warranties.',
            cells: { cuppi: yes(), hartley: yes('Called Garage, reminders only'), familywall: no() },
            sources: { hartley: [TEAM_TEST, 'hartley-store'], familywall: ['fw-store'] },
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
            sources: { hartley: [TEAM_TEST], familywall: [TEAM_TEST] },
          },
          {
            id: 'security',
            label: 'Sign-in security',
            detail: 'Face ID or Touch ID, two-step verification and a sensitive-activity log.',
            cells: { cuppi: yes(), hartley: yes(), familywall: yes() },
            sources: { hartley: ['hartley-privacy'], familywall: [TEAM_TEST] },
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
    ],
    notYet: 'Cuppi doesn’t have a shared calendar, location sharing or a documents vault, and it isn’t on Android yet.',
    testNote:
      'Where a claim is marked as tested, the Cuppi team used that app itself and recorded what it found on the date shown. Apps change as they update, so what we saw may not match what you see later.',
    panels: {
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
    },
    prices: {
      hartley: { monthly: 0, funding: 'Free. Earns commission on trader and provider suggestions.', sources: ['hartley-site', 'hartley-terms'] },
      familywall: { monthly: 5.99, funding: 'Limited free with ads, or Premium at £5.99 a month.', sources: ['fw-store', 'fw-premium'] },
    },
    trial: '1 month free trial for new users, 2 months free with an invite code.',
    sources: [
      source('cuppi-store', 'Cuppi Home, UK App Store listing', 'https://apps.apple.com/gb/app/cuppi/id6754384902'),
      source('hartley-store', 'Hartley, UK App Store listing', 'https://apps.apple.com/gb/app/hartley-home-management-app/id6751110777'),
      source('hartley-site', 'Hartley website and FAQ', 'https://www.hellohartley.co.uk'),
      source('hartley-how', 'Hartley, how it works', 'https://www.hellohartley.co.uk/product'),
      source('hartley-privacy', 'Hartley privacy policy', 'https://www.hellohartley.co.uk/privacy-policy'),
      source('hartley-terms', 'Hartley terms and conditions', 'https://www.hellohartley.co.uk/terms-conditions'),
      source('hartley-owner', 'Companies House: Hartley Technology Limited, persons with significant control', 'https://find-and-update.company-information.service.gov.uk/company/16471418/persons-with-significant-control'),
      source('fw-store', 'FamilyWall, UK App Store listing', 'https://apps.apple.com/gb/app/familywall-family-organizer/id496889629'),
      source('fw-site', 'FamilyWall website', 'https://www.familywall.com'),
      source('fw-premium', 'FamilyWall Premium plans', 'https://www.familywall.com/premium.html'),
      source('fw-privacy', 'FamilyWall privacy policy', 'https://www.familywall.com/privacy.html'),
      source('fw-terms', 'FamilyWall terms of use', 'https://www.familywall.com/terms.html'),
      source(TEAM_TEST, 'Tested by the Cuppi team in the app', SNAPSHOTS_PATH),
    ],
    showLook: true,
    lookTitle: 'A look inside',
    lookIntro: 'The same few taps, in each app.',
    lookCaptions: { cuppi: 'Cuppi Home on iPhone', hartley: 'Hartley, captured {date}', familywall: 'FamilyWall, captured {date}' },
    shots: { cuppi: [], hartley: [], familywall: [] },
    snapshotsIntro:
      'Each snapshot is a screenshot taken by the Cuppi team in the app itself, shown with the version, phone and date where we recorded them. Apps change as they update, so these show what we saw on the day.',
    snapshots: [],
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** "£59.90" -> 59.9. Anything it cannot read gives undefined, and the page leaves that bar out. */
export function parsePounds(text: string): number | undefined {
  const m = /(\d+(?:[.,]\d+)?)/.exec(text.replace(/,(?=\d{3}\b)/g, ''));
  if (!m) return undefined;
  const n = Number(m[1].replace(',', '.'));
  return Number.isFinite(n) ? n : undefined;
}

/** 5.99 -> "£5.99", 0 -> "£0". */
export const formatPounds = (n: number): string => `£${Number.isInteger(n) ? n : n.toFixed(2)}`;

/** "2026-11-19" -> "19 Nov 2026" (read as a calendar day, so no time zone can move it). Anything else comes back as it was. */
export function dateLabel(iso: string | undefined): string {
  const m = iso && /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return iso ?? '';
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
}

export const sourceById = (content: Pick<CompareContent, 'sources'>, id: string): Source | undefined => content.sources.find((s) => s.id === id);

/** Every row of the matrix, in page order. */
export const allRows = (content: Pick<CompareContent, 'groups'>): FactRow[] => content.groups.flatMap((g) => g.rows);

/**
 * Each source's number, in the order the page first cites it (the matrix, then the data panels, then the prices), so the
 * small numbers beside a claim and the list at the foot of the page agree. A source never cited has no number.
 */
export function numberSources(content: CompareContent): Map<string, number> {
  const numbers = new Map<string, number>();
  const see = (ids: string[] = []) => ids.forEach((id) => numbers.has(id) || numbers.set(id, numbers.size + 1));
  for (const row of allRows(content)) for (const app of RIVALS) see(row.sources[app]);
  for (const app of APP_IDS) see(content.panels[app].sources);
  see(content.prices.hartley.sources);
  see(content.prices.familywall.sources);
  return numbers;
}

/** A rival's cell that cites the team's own testing but has no screenshot for that app in the snapshots yet. */
export type ProofGap = { rowId: string; label: string; app: AppId };

/** The claims resting on "tested in the app" that have no screenshot behind them yet: what the admin should capture next. */
export function proofGaps(content: CompareContent): ProofGap[] {
  const gaps: ProofGap[] = [];
  for (const row of allRows(content)) {
    for (const app of RIVALS) {
      if (!(row.sources[app] ?? []).includes(TEAM_TEST)) continue;
      const snap = content.snapshots.find((s) => s.rowId === row.id);
      if ((snap?.apps[app]?.shots.length ?? 0) === 0) gaps.push({ rowId: row.id, label: row.label, app });
    }
  }
  return gaps;
}

/** An app's caption under "A look inside", with {date} turned into the day the facts were checked. */
export const captionFor = (content: Pick<CompareContent, 'lookCaptions' | 'checkedOn'>, app: AppId): string =>
  content.lookCaptions[app].replaceAll('{date}', dateLabel(content.checkedOn));

/** A source's address as a link: whether it leaves the site. */
export const isExternalUrl = (url: string): boolean => /^https?:\/\//.test(url);
