// The shape of a Cuppi feature page. Plain JSON on purpose: today it is seeded
// from features-seed.ts, and the admin (next step) will edit exactly this shape
// in Firestore, so a page built here never needs reworking to become editable.
//
// A feature page is a hero plus an ordered list of "blocks". Each block is one of
// a small set of reusable layouts (src/components/cuppi/blocks). The admin only
// has to pick a layout and fill in its fields, like the Apps & Websites editor.

/** The colour a feature wears on its cards and hero. Maps to the brand palette. */
export type FeatureTint = 'honey' | 'sky' | 'moss' | 'clay' | 'lake';

export type FeatureIcon =
  | 'home'
  | 'cake'
  | 'bin'
  | 'paw'
  | 'receipt'
  | 'wallet'
  | 'palette'
  | 'shield'
  | 'user'
  | 'users'
  | 'star'
  | 'sparkles';

/**
 * Where a feature sits. 'family', 'home' and 'finance' fill the Features menu (the
 * app's features, sorted by what they are for); 'yours' fills the second menu.
 */
export type FeatureGroup = 'family' | 'home' | 'finance' | 'yours';

/** The colour of a feature's app-icon tile, as in the app's Apps tab. */
export type TileColour = 'pink' | 'green' | 'blue' | 'amber';

export type FeatureStatus = 'live' | 'preview' | 'soon';

export type FeatureImage = {
  url: string;
  alt: string;
  /** 'phone' (default): a transparent phone crop that rises from the bottom edge.
   *  'photo': a normal photograph, shown full-bleed to fill its space. */
  fit?: 'phone' | 'photo';
};

export type FeatureCard = { title: string; body: string; image: FeatureImage };

export type FeatureBlock =
  // Text on one side, a phone peeking out of a colour card on the other.
  | {
      id: string;
      type: 'showcase';
      eyebrow?: string;
      title: string;
      body: string;
      image: FeatureImage;
      side: 'left' | 'right';
      tint: FeatureTint;
    }
  // A swipeable row of phone cards, each with a title and a few lines.
  | {
      id: string;
      type: 'cards';
      title: string;
      intro?: string;
      cards: FeatureCard[];
      /** Small print under the cards (asterisked notes). */
      footnotes?: string[];
    }
  // One big warm sentence on a colour band.
  | { id: string; type: 'callout'; title: string; body?: string; tint: FeatureTint }
  // Three or four short reasons, no images.
  | { id: string; type: 'points'; title?: string; items: { title: string; body: string }[] };

export type FeatureHero = {
  headline: string;
  intro: string;
  /** A phone crop that peeks up out of the bottom of the hero card. */
  image: FeatureImage;
  /** 'peek': a phone crop rising from the card's bottom edge (default).
   *  'wide': a landscape picture shown whole, e.g. a fan of phones. */
  imageStyle?: 'peek' | 'wide';
};

export type Feature = {
  slug: string;
  /** Short name for the menu and cards, e.g. "Bin Day". */
  name: string;
  /** One line for the menu and the overview cards. */
  tagline: string;
  icon: FeatureIcon;
  tint: FeatureTint;
  group: FeatureGroup;
  status: FeatureStatus;
  /** Position in the menu and overview (lowest first). */
  order: number;
  /** The app's own icon for this feature (a transparent glyph in /public/icons). */
  iconUrl?: string;
  tile: TileColour;
  /** A feature with status 'soon' has no page yet: it shows in menus, but does not link. */
  hero?: FeatureHero;
  blocks?: FeatureBlock[];
};

/** A feature that has a page of its own. */
export type PageFeature = Feature & { hero: FeatureHero; blocks: FeatureBlock[] };
export const hasPage = (f: Feature): f is PageFeature => f.status !== 'soon' && !!f.hero && !!f.blocks;

export const GROUP_LABELS: Record<FeatureGroup, { title: string; blurb: string }> = {
  family: { title: 'Family life', blurb: 'The people and pets you share a home with' },
  home: { title: 'Home', blurb: 'Shopping, bins and the car' },
  finance: { title: 'Finance', blurb: 'Budgets and receipts, clear and calm' },
  yours: { title: 'Your Home', blurb: 'The feed, your colours and your privacy' },
};

export const GROUP_ORDER: FeatureGroup[] = ['family', 'home', 'finance', 'yours'];

/** Which groups open from which menu button in the header. */
export const MENU_GROUPS: { key: 'features' | 'yours'; label: string; groups: FeatureGroup[] }[] = [
  { key: 'features', label: 'Features', groups: ['family', 'home', 'finance'] },
  { key: 'yours', label: 'Your Home', groups: ['yours'] },
];

export const STATUS_LABELS: Record<FeatureStatus, string | null> = {
  live: null,
  preview: 'Preview',
  soon: 'Coming soon',
};

/**
 * Sanity-checks a list of features and returns a plain-English list of problems
 * (empty when all is well). Used on the seed now and on admin-entered data later.
 * It reports, it never throws: a typo in one feature must not blank the site.
 */
export function validateFeatures(features: Feature[]): string[] {
  const problems: string[] = [];
  const slugs = new Set<string>();
  for (const f of features) {
    const where = `Feature "${f.name || f.slug || '(unnamed)'}"`;
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(f.slug ?? '')) problems.push(`${where}: slug "${f.slug}" must be lowercase words joined by hyphens.`);
    if (slugs.has(f.slug)) problems.push(`${where}: slug "${f.slug}" is used twice.`);
    slugs.add(f.slug);
    if (!GROUP_ORDER.includes(f.group)) problems.push(`${where}: unknown group "${f.group}".`);
    if (f.status !== 'soon') {
      if (!f.hero?.headline?.trim()) problems.push(`${where}: the hero has no headline.`);
      if (!f.hero?.image?.url) problems.push(`${where}: the hero has no image.`);
    }
    const blockIds = new Set<string>();
    for (const b of f.blocks ?? []) {
      if (blockIds.has(b.id)) problems.push(`${where}: block id "${b.id}" is used twice.`);
      blockIds.add(b.id);
      if (b.type === 'cards' && b.cards.length === 0) problems.push(`${where}: cards block "${b.id}" has no cards.`);
      if (b.type === 'points' && b.items.length === 0) problems.push(`${where}: points block "${b.id}" has no items.`);
      if (b.type === 'showcase' && !b.image?.url) problems.push(`${where}: showcase block "${b.id}" has no image.`);
    }
  }
  return problems;
}
