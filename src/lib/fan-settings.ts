// The icon banner: Cuppi's icon with the in-app icons sliding out of it (AppFan), on the home
// page and the Support page. One document (cuppi_home/fan) holds which features appear and in
// what order. The icons themselves are the features' own (set on the Cuppi features page), so
// changing a feature's icon there changes it here too.
//
// Whatever is stored is only ever read through resolveFan, which drops features that no longer
// exist, adds new ones (switched off, so a new feature never joins the banner by surprise) and
// keeps to the room the layout has, so a bad document can make the banner plain but never break a page.

/** The layout has room for this many icons beside Cuppi's own. */
export const FAN_MAX = 8;

export type FanEntry = { slug: string; visible: boolean };

/**
 * Stored document + the features that could be in the banner (in the order the site lists them)
 * -> every one of them, in banner order, each switched on or off. Nothing stored gives the
 * first FAN_MAX features, which is how the banner looked before it was editable.
 */
export function resolveFan(stored: unknown, candidates: { slug: string }[]): FanEntry[] {
  const known = new Set(candidates.map((c) => c.slug));
  const raw = stored && typeof stored === 'object' ? (stored as Record<string, unknown>).icons : undefined;

  const entries: FanEntry[] = [];
  const seen = new Set<string>();
  if (Array.isArray(raw)) {
    for (const item of raw) {
      if (!item || typeof item !== 'object') continue;
      const { slug, visible } = item as Record<string, unknown>;
      if (typeof slug !== 'string' || !known.has(slug) || seen.has(slug)) continue;
      seen.add(slug);
      entries.push({ slug, visible: visible === true });
    }
    // Features added since this was saved wait at the end, off.
    for (const c of candidates) if (!seen.has(c.slug)) entries.push({ slug: c.slug, visible: false });
  } else {
    candidates.forEach((c, i) => entries.push({ slug: c.slug, visible: i < FAN_MAX }));
  }

  // Only FAN_MAX fit; the first ones stay on, any beyond are switched off.
  let on = 0;
  return entries.map((e) => (e.visible && on++ < FAN_MAX ? e : { ...e, visible: false }));
}

/** The features to draw in the banner, in order. */
export function applyFan<T extends { slug: string }>(features: T[], stored: unknown): T[] {
  const bySlug = new Map(features.map((f) => [f.slug, f]));
  return resolveFan(stored, features)
    .filter((e) => e.visible)
    .map((e) => bySlug.get(e.slug)!);
}

export const fanShownCount = (entries: FanEntry[]): number => entries.filter((e) => e.visible).length;
