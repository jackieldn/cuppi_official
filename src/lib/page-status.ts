// Which parts of the Cuppi site are live, and which are showing "refresh in progress" while
// they are being updated. One document (cuppi_pages/status) holds a switch per section; what
// is stored is only read through resolvePageStatus, which fills gaps from the defaults below.
//
// Legal pages and the other pages people may need (privacy, terms, family safety, security,
// invite links) are deliberately not in this list: they cannot be switched off.

export type SectionKey = 'home' | 'features' | 'blog' | 'faq' | 'support';
export type SectionStatus = 'live' | 'refresh';

export type Section = {
  key: SectionKey;
  label: string;
  /** How the holding page names it in a sentence: "We are updating {phrase}". */
  phrase: string;
  /** What switching it affects, in the admin. */
  covers: string;
  path: string;
  /** Used until the admin has saved anything, and whenever the database cannot be read. */
  defaultStatus: SectionStatus;
};

export const SECTIONS: Section[] = [
  { key: 'home', phrase: 'the home page', label: 'Home page', covers: 'The front page', path: '/', defaultStatus: 'live' },
  { key: 'blog', phrase: 'the Cosy Corner', label: 'The Cosy Corner', covers: 'The article list and every article', path: '/blog', defaultStatus: 'live' },
  { key: 'faq', phrase: 'the help centre', label: 'FAQ', covers: 'The help centre, its topics and search', path: '/faq', defaultStatus: 'live' },
  { key: 'support', phrase: 'the support page', label: 'Support', covers: 'The support page and message form', path: '/support', defaultStatus: 'live' },
  { key: 'features', phrase: 'the feature pages', label: 'Features', covers: 'The overview and every feature page', path: '/features', defaultStatus: 'refresh' },
];

/** Pages that are always reachable, shown (locked) in the admin so nobody wonders about them. */
export const ALWAYS_LIVE: { label: string; path: string }[] = [
  { label: 'Privacy', path: '/privacy' },
  { label: 'Terms', path: '/terms' },
  { label: 'Family Safety', path: '/family-safety' },
  { label: 'Security', path: '/security' },
];

export type PageStatus = Record<SectionKey, SectionStatus>;

export function defaultPageStatus(): PageStatus {
  return Object.fromEntries(SECTIONS.map((s) => [s.key, s.defaultStatus])) as PageStatus;
}

/** Stored document -> a complete status for every section. Anything unrecognised keeps its default. */
export function resolvePageStatus(stored: unknown): PageStatus {
  const status = defaultPageStatus();
  if (!stored || typeof stored !== 'object') return status;
  const s = stored as Record<string, unknown>;
  for (const { key } of SECTIONS) {
    if (s[key] === 'live' || s[key] === 'refresh') status[key] = s[key] as SectionStatus;
  }
  return status;
}

export const isLive = (status: PageStatus, key: SectionKey): boolean => status[key] === 'live';
