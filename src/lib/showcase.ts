// Apps & Websites showcase: the data model and the small pure helpers around it.
// No imports on purpose, so it runs the same on the server, in the browser and in
// the unit tests (tests/unit/showcase.test.mjs).

export type AppKind = 'app' | 'website';

/**
 * live            - out in the world (App Store / on the web)
 * testflight      - apps only: installable through TestFlight, not on the App Store
 * decommissioned  - no longer running; kept on the page as part of the history
 */
export type AppStatus = 'live' | 'testflight' | 'decommissioned';

export type ShowcaseImage = {
  url: string;
  width: number;
  height: number;
};

/** A row of screenshots. */
export type GallerySection = {
  id: string;
  type: 'gallery';
  /** Optional heading above the screenshots. */
  title: string;
  images: ShowcaseImage[];
};

/** Text on one side, one screenshot on the other. */
export type FeatureSection = {
  id: string;
  type: 'feature';
  title: string;
  body: string;
  /** Which side the text sits on; the image takes the other. */
  textSide: 'left' | 'right';
  image: ShowcaseImage | null;
};

export type ShowcaseSection = GallerySection | FeatureSection;

/** Only here for entries saved before the redesign; the new admin no longer writes it. */
export type LegacyUpdate = {
  id: string;
  date: string;
  version: string;
  description: string;
};

export type App = {
  id: string;
  title: string;
  slug: string;
  kind: AppKind;
  status: AppStatus;
  /** One line for the card. */
  tagline: string;
  /** The intro on the detail page. Plain text; blank lines are paragraph breaks. */
  description: string;
  tags: string[];
  /** Apps only (iOS, Android, ...). */
  platforms: string[];
  releaseDate: string;
  /** Set when status is decommissioned. */
  decommissionedDate: string;
  /** App Store, TestFlight or website address, depending on kind and status. */
  link: string;
  /** App icon or site logo: the face of the card and of the page's top. */
  icon: ShowcaseImage | null;
  /** Dominant colour of the icon (#rrggbb), picked in the admin. Tints the backgrounds. */
  iconColor: string;
  sections: ShowcaseSection[];
  /** Position within its group (apps / websites, live first). Lower comes first. */
  order?: number;
  /** Saved by the old admin; read only to fill in the fields above. */
  updateHistory?: LegacyUpdate[];
  /**
   * A cover screenshot, from before the icon took over. Never shown; kept only so the admin
   * can remove its file from storage the next time the entry is saved.
   */
  coverImage?: ShowcaseImage | null;
};

/** Used for the backgrounds when an entry has no icon colour yet (the portfolio's ocean blue). */
export const FALLBACK_ICON_COLOR = '#40798c';

export const isHexColour = (v: unknown): v is string => typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v);

export const KIND_LABEL: Record<AppKind, string> = { app: 'App', website: 'Website' };
export const KIND_PLURAL: Record<AppKind, string> = { app: 'Apps', website: 'Websites' };

export const STATUS_LABEL: Record<AppStatus, string> = {
  live: 'Live',
  testflight: 'TestFlight',
  decommissioned: 'Decommissioned',
};

export const STATUSES: AppStatus[] = ['live', 'testflight', 'decommissioned'];

/** Where each status sorts: live first, decommissioned last. */
const STATUS_RANK: Record<AppStatus, number> = { live: 0, testflight: 1, decommissioned: 2 };

export const APP_PLATFORMS = ['iOS', 'iPadOS', 'macOS', 'Android', 'Windows'] as const;

// ---------------------------------------------------------------------------
// Reading what's in Firestore
// ---------------------------------------------------------------------------

type Raw = Record<string, any>;

const isObject = (v: unknown): v is Raw => typeof v === 'object' && v !== null && !Array.isArray(v);
const str = (v: unknown): string => (typeof v === 'string' ? v : '');
const strList = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && x.trim() !== '').map((x) => x.trim()) : [];

function image(v: unknown): ShowcaseImage | null {
  if (!isObject(v) || typeof v.url !== 'string' || !v.url) return null;
  return {
    url: v.url,
    width: Number(v.width) > 0 ? Number(v.width) : 0,
    height: Number(v.height) > 0 ? Number(v.height) : 0,
  };
}

function section(v: unknown, index: number): ShowcaseSection | null {
  if (!isObject(v)) return null;
  const id = str(v.id) || `section-${index}`;
  if (v.type === 'gallery') {
    const images = (Array.isArray(v.images) ? v.images : []).map(image).filter((x): x is ShowcaseImage => !!x);
    return { id, type: 'gallery', title: str(v.title), images };
  }
  if (v.type === 'feature') {
    return {
      id,
      type: 'feature',
      title: str(v.title),
      body: str(v.body),
      textSide: v.textSide === 'right' ? 'right' : 'left',
      image: image(v.image),
    };
  }
  return null;
}

/** Strips tags and tidies whitespace, for a card line made out of a longer description. */
export function plainText(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

function clip(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}

const LEGACY_STATUS: Record<string, AppStatus> = {
  Available: 'live',
  Beta: 'testflight',
  'In Development': 'testflight',
  Retired: 'decommissioned',
};

/**
 * Turns whatever is stored for an entry into the current shape. Entries saved by
 * the old admin (availability, a flat gallery, no kind) are mapped across, so the
 * redesign works on existing data without a migration; opening one in the new admin
 * and saving it writes the new fields.
 */
export function normalizeApp(raw: Raw & { id: string }): App {
  const legacyPlatforms = strList(raw.platforms);
  const webOnly = legacyPlatforms.length > 0 && legacyPlatforms.every((p) => p.toLowerCase() === 'web');
  const kind: AppKind = raw.kind === 'website' || raw.kind === 'app' ? raw.kind : webOnly ? 'website' : 'app';

  let status: AppStatus = STATUSES.includes(raw.status) ? raw.status : LEGACY_STATUS[str(raw.availability)] ?? 'live';
  if (kind === 'website' && status === 'testflight') status = 'live';

  let sections: ShowcaseSection[];
  if (Array.isArray(raw.sections)) {
    sections = raw.sections.map(section).filter((s): s is ShowcaseSection => !!s);
  } else {
    const legacyGallery = (Array.isArray(raw.galleryImages) ? raw.galleryImages : [])
      .map(image)
      .filter((x): x is ShowcaseImage => !!x);
    sections = legacyGallery.length
      ? [{ id: 'gallery', type: 'gallery', title: 'Gallery', images: legacyGallery }]
      : [];
  }

  const description = str(raw.description);
  return {
    id: raw.id,
    title: str(raw.title),
    slug: str(raw.slug),
    kind,
    status,
    tagline: str(raw.tagline).trim() || clip(plainText(description), 140),
    description,
    tags: strList(raw.tags),
    platforms: kind === 'website' ? [] : legacyPlatforms.filter((p) => p.toLowerCase() !== 'web'),
    releaseDate: str(raw.releaseDate),
    decommissionedDate: str(raw.decommissionedDate),
    link: str(raw.link),
    icon: image(raw.icon),
    iconColor: isHexColour(raw.iconColor) ? raw.iconColor.toLowerCase() : '',
    sections,
    order: typeof raw.order === 'number' ? raw.order : undefined,
    updateHistory: Array.isArray(raw.updateHistory) ? raw.updateHistory : undefined,
    coverImage: image(raw.coverImage),
  };
}

// ---------------------------------------------------------------------------
// Ordering and display helpers
// ---------------------------------------------------------------------------

/** Live first, then TestFlight, decommissioned last; inside that by `order`, then newest. */
export function compareApps(a: App, b: App): number {
  return (
    STATUS_RANK[a.status] - STATUS_RANK[b.status] ||
    (a.order ?? Infinity) - (b.order ?? Infinity) ||
    b.releaseDate.localeCompare(a.releaseDate) ||
    a.title.localeCompare(b.title)
  );
}

export function sortApps(apps: App[]): App[] {
  return [...apps].sort(compareApps);
}

/**
 * What the admin's up/down arrows reorder within: the same kind and the same status.
 * Status ranks above `order` on the public page, so moving an entry past one of a
 * different status would change nothing visible.
 */
export function orderGroup(app: Pick<App, 'kind' | 'status'>): string {
  return `${app.kind}:${app.status}`;
}

export function hostOf(url: string): string {
  try {
    return new URL(url).host.replace(/^www\./, '');
  } catch {
    return '';
  }
}

/** The call-to-action for an entry, or null when there's nothing to link to. */
export function linkAction(app: Pick<App, 'kind' | 'status' | 'link'>): { label: string; href: string } | null {
  if (!app.link || app.status === 'decommissioned') return null;
  if (app.kind === 'website') return { label: 'Visit website', href: app.link };
  if (app.status === 'testflight') return { label: 'Join the TestFlight', href: app.link };
  return { label: hostOf(app.link) === 'apps.apple.com' ? 'View on the App Store' : 'Open the app', href: app.link };
}

/** Width / height of a screenshot; 1 when its size wasn't recorded. */
export function aspectOf(img: Pick<ShowcaseImage, 'width' | 'height'> | null | undefined): number {
  return img && img.width > 0 && img.height > 0 ? img.width / img.height : 1;
}

/** "March 2026" from a yyyy-mm-dd (or full ISO) date; empty when it can't be read. */
export function monthYear(date: string): string {
  const d = new Date(date);
  if (!date || Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
}

export function yearOf(date: string): string {
  const d = new Date(date);
  return !date || Number.isNaN(d.getTime()) ? '' : String(d.getFullYear());
}

/** Every screenshot on a page, in reading order (cover aside), for the full-size viewer. */
export function sectionImages(sections: ShowcaseSection[]): ShowcaseImage[] {
  return sections.flatMap((s) => (s.type === 'gallery' ? s.images : s.image ? [s.image] : []));
}
