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
  /** Off hides the feature everywhere (menus, overview, footer, its page). Missing means on. */
  published?: boolean;
  /** Off keeps the feature out of the top menu only; its page and the overview still show it. Missing means on. */
  showInMenu?: boolean;
};

/** A feature that has a page of its own. */
export type PageFeature = Feature & { hero: FeatureHero; blocks: FeatureBlock[] };
export const hasPage = (f: Feature): f is PageFeature => f.status !== 'soon' && !!f.hero && !!f.blocks;

export const isPublished = (f: Feature): boolean => f.published !== false;
/** Listed in the top menu: published, and not switched off for the menu. */
export const inMenu = (f: Feature): boolean => isPublished(f) && f.showInMenu !== false;

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

// ---------------------------------------------------------------------------
// Edits made in the admin. The seed above is the starting point; a document in the
// cuppi_features collection (one per slug) changes a seed feature field by field, or,
// for a slug the seed does not have, is a whole new feature. Everything read from the
// database goes through readOverride, which keeps only fields of the right type, so a
// bad value can hide a field's edit but never break a page.
// ---------------------------------------------------------------------------

export const FEATURE_ICONS: FeatureIcon[] = ['home', 'cake', 'bin', 'paw', 'receipt', 'wallet', 'palette', 'shield', 'user', 'users', 'star', 'sparkles'];
export const TILE_COLOURS_LIST: TileColour[] = ['pink', 'green', 'blue', 'amber'];
export const FEATURE_STATUSES: FeatureStatus[] = ['live', 'preview', 'soon'];
const TINTS_LIST: FeatureTint[] = ['honey', 'sky', 'moss', 'clay', 'lake'];

/** The page tint a new feature gets from its tile colour. */
export const TILE_TINT: Record<TileColour, FeatureTint> = { pink: 'clay', green: 'moss', blue: 'sky', amber: 'honey' };

export type FeatureOverride = Partial<Feature> & { slug: string };

const STORAGE_PREFIX = 'https://firebasestorage.googleapis.com/v0/b/studio-5700093446-89b93.firebasestorage.app/';

/**
 * A picture address that is safe to give next/image: a file on this site, or one in the site's
 * own Firebase Storage bucket (where admin uploads go). next/image refuses any other host, so
 * letting one through here would break the page instead of just hiding the picture.
 */
export function safeImageUrl(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const v = value.trim();
  if (v.startsWith('/') && !v.startsWith('//') && !/\s/.test(v)) return v;
  return v.startsWith(STORAGE_PREFIX) && !/\s/.test(v) ? v : undefined;
}

const str = (v: unknown, max = 600): string | undefined => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : undefined);

/** Turns a stored document into an override, dropping anything that is not the right type. */
export function readOverride(slug: string, raw: unknown): FeatureOverride | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const o: FeatureOverride = { slug };
  const name = str(r.name, 60);
  if (name) o.name = name;
  if (typeof r.tagline === 'string') o.tagline = r.tagline.trim().slice(0, 200);
  if (FEATURE_ICONS.includes(r.icon as FeatureIcon)) o.icon = r.icon as FeatureIcon;
  if (TINTS_LIST.includes(r.tint as FeatureTint)) o.tint = r.tint as FeatureTint;
  if (GROUP_ORDER.includes(r.group as FeatureGroup)) o.group = r.group as FeatureGroup;
  if (FEATURE_STATUSES.includes(r.status as FeatureStatus)) o.status = r.status as FeatureStatus;
  if (TILE_COLOURS_LIST.includes(r.tile as TileColour)) o.tile = r.tile as TileColour;
  if (typeof r.order === 'number' && Number.isFinite(r.order)) o.order = r.order;
  const iconUrl = safeImageUrl(r.iconUrl);
  if (iconUrl) o.iconUrl = iconUrl;
  if (typeof r.published === 'boolean') o.published = r.published;
  if (typeof r.showInMenu === 'boolean') o.showInMenu = r.showInMenu;
  const h = r.hero as Record<string, unknown> | undefined;
  const heroImage = h && typeof h === 'object' ? (h.image as Record<string, unknown> | undefined) : undefined;
  const heroImageUrl = safeImageUrl(heroImage?.url);
  if (h && typeof h === 'object' && str(h.headline, 200) && heroImageUrl) {
    o.hero = {
      headline: str(h.headline, 200)!,
      intro: typeof h.intro === 'string' ? h.intro.trim().slice(0, 600) : '',
      image: { url: heroImageUrl, alt: str(heroImage?.alt, 200) ?? '', ...(heroImage?.fit === 'photo' ? { fit: 'photo' as const } : {}) },
      ...(h.imageStyle === 'wide' ? { imageStyle: 'wide' as const } : {}),
    };
  }
  if (Array.isArray(r.blocks)) o.blocks = r.blocks as FeatureBlock[];
  return o;
}

/**
 * The seed with the admin's edits applied, in menu order. A seed feature takes whatever
 * fields its override has. An override for a slug the seed lacks is a new feature, kept
 * only if it has a name. A feature with a page needs `blocks` (an empty list is fine), so
 * one is supplied whenever an edit gives a feature its first hero.
 */
export function mergeFeatures(seed: Feature[], overrides: FeatureOverride[]): Feature[] {
  const bySlug = new Map(overrides.map((o) => [o.slug, o]));
  const merged: Feature[] = seed.map((f) => {
    const o = bySlug.get(f.slug);
    if (!o) return f;
    const m: Feature = { ...f, ...o };
    if (m.hero && !m.blocks) m.blocks = [];
    return m;
  });
  const known = new Set(seed.map((f) => f.slug));
  for (const o of overrides) {
    if (known.has(o.slug) || !o.name) continue;
    const tile = o.tile ?? 'amber';
    merged.push({
      ...o,
      slug: o.slug,
      name: o.name,
      tagline: o.tagline ?? '',
      icon: o.icon ?? 'sparkles',
      tile,
      tint: o.tint ?? TILE_TINT[tile],
      group: o.group ?? 'home',
      status: o.status ?? 'live',
      order: o.order ?? 1000,
      ...(o.hero ? { blocks: o.blocks ?? [] } : {}),
    });
  }
  return merged.sort((a, b) => a.order - b.order);
}

/** A slug for a new feature from its name: lowercase words joined by hyphens. */
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
    .replace(/-+$/, '');
}
