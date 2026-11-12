// The top menu as the admin sets it. One document (cuppi_menu/main) holds the order of the
// links, each link's label, address and on/off switch, and the Download button. Whatever is
// stored is only ever read through resolveMenu, which fills gaps from the defaults and drops
// anything unsafe, so a bad document can make the menu look plain but never break a page.

/** The two links that open a panel of features; the rest are plain links. */
export type MenuPanel = 'features' | 'yours';

export type MenuLink = {
  /** Built-in links have a fixed key; links the admin adds are "custom-...". */
  key: string;
  label: string;
  /** Where it goes. Panel links always go to /features (the panel is the feature list). */
  href: string;
  visible: boolean;
  /** Opens a panel of features (hover), instead of being a plain link. */
  panel?: MenuPanel;
  /** Added by the admin, so it can be deleted. */
  custom?: boolean;
};

export type DownloadButton = { label: string; href: string; visible: boolean };
export type MenuSettings = { links: MenuLink[]; download: DownloadButton };

export const BUILT_IN_LINKS: MenuLink[] = [
  { key: 'features', label: 'Features', href: '/features', visible: true, panel: 'features' },
  { key: 'yours', label: 'Your Home', href: '/features', visible: true, panel: 'yours' },
  { key: 'blog', label: 'The Cosy Corner', href: '/blog', visible: true },
  { key: 'faq', label: 'FAQ', href: '/faq', visible: true },
  { key: 'support', label: 'Support', href: '/support', visible: true },
];

export const MAX_LABEL = 30;
export const MAX_CUSTOM_LINKS = 4;

export function defaultMenu(downloadHref: string): MenuSettings {
  return { links: BUILT_IN_LINKS.map((l) => ({ ...l })), download: { label: 'Download', href: downloadHref, visible: true } };
}

/**
 * An address that is safe to put in a link: a path on this site ("/pricing") or an https
 * address. Returns null for anything else ("javascript:...", "//host", plain words).
 */
export function safeHref(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const v = value.trim();
  if (v.startsWith('/') && !v.startsWith('//') && !/\s/.test(v)) return v;
  if (/^https:\/\/[^\s/]+[^\s]*$/.test(v)) return v;
  return null;
}

export const isExternal = (href: string): boolean => /^https?:\/\//.test(href);

const label = (v: unknown, fallback: string): string => {
  const t = typeof v === 'string' ? v.trim().slice(0, MAX_LABEL) : '';
  return t || fallback;
};

/** Stored document -> a complete, safe menu. Order is the stored order; missing built-ins are added at the end. */
export function resolveMenu(stored: unknown, downloadHref: string): MenuSettings {
  const base = defaultMenu(downloadHref);
  const s = stored && typeof stored === 'object' ? (stored as Record<string, unknown>) : {};

  const links: MenuLink[] = [];
  const seen = new Set<string>();
  let custom = 0;
  for (const raw of Array.isArray(s.links) ? s.links : []) {
    if (!raw || typeof raw !== 'object') continue;
    const r = raw as Record<string, unknown>;
    const key = typeof r.key === 'string' ? r.key : '';
    if (seen.has(key)) continue;
    const builtIn = BUILT_IN_LINKS.find((b) => b.key === key);
    const visible = typeof r.visible === 'boolean' ? r.visible : true;
    if (builtIn) {
      seen.add(key);
      links.push({
        ...builtIn,
        label: label(r.label, builtIn.label),
        // Panel links are the feature list, so their address is fixed.
        href: builtIn.panel ? builtIn.href : (safeHref(r.href) ?? builtIn.href),
        visible,
      });
    } else if (/^custom-[a-z0-9-]{1,40}$/.test(key) && custom < MAX_CUSTOM_LINKS) {
      const href = safeHref(r.href);
      if (!href) continue; // a custom link with no usable address is dropped
      seen.add(key);
      custom++;
      links.push({ key, label: label(r.label, 'Link'), href, visible, custom: true });
    }
  }
  for (const b of base.links) if (!seen.has(b.key)) links.push(b);

  const d = s.download && typeof s.download === 'object' ? (s.download as Record<string, unknown>) : {};
  return {
    links,
    download: {
      label: label(d.label, base.download.label),
      href: safeHref(d.href) ?? downloadHref,
      visible: typeof d.visible === 'boolean' ? d.visible : true,
    },
  };
}

/** Plain-English problems with a menu being saved (empty when fine). The admin form shows these. */
export function validateMenu(menu: MenuSettings): string[] {
  const problems: string[] = [];
  for (const l of menu.links) {
    if (!l.label.trim()) problems.push('Every link needs a name.');
    if (!l.panel && !safeHref(l.href)) problems.push(`"${l.label || 'A link'}" needs an address that starts with / (a page on this site) or https://.`);
  }
  if (!safeHref(menu.download.href)) problems.push('The Download button needs an address that starts with https:// (or / for a page on this site).');
  if (!menu.download.label.trim()) problems.push('The Download button needs a name.');
  return [...new Set(problems)];
}

/** A key for a new custom link, never one already in use. */
export function newCustomKey(links: MenuLink[]): string {
  let n = 1;
  while (links.some((l) => l.key === `custom-${n}`)) n++;
  return `custom-${n}`;
}
