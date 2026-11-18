// The Plans page (/plans): what Free and Pro each get, one table per feature under each other,
// with the prices above them. One document (cuppi_home/plans) holds the prices and the sections.
//
// A section is a feature (its icon and name come from the feature, so renaming or re-icon-ing it on
// the Cuppi features page changes it here too) or, for what belongs to no feature, a section of the
// admin's own with a title. Either way the lines of the table are kept in the section itself: adding
// a feature copies the lines from the table on its own page (see featurePlanRows), after which the
// two are independent, so the Plans page can say more (or less) than a feature page does.
//
// Whatever is stored is only ever read through resolvePlans, which keeps only what is usable, so a bad
// document can make the page plainer but never break it. Nothing stored gives every feature that
// already has a Free / Pro table on its page, in feature order: the page works before it is edited.

import type { FeatureBlock, PlanRow } from './features-types.ts';
import { SECTION_LIMITS, readPlanRows } from './feature-sections.ts';

export const PLANS_LIMITS = {
  /** Tables on the page. */
  sections: 30,
  price: 20,
  note: 60,
  title: 60,
  intro: 300,
} as const;

export type PlansPrices = { monthly: string; annual: string; annualNote: string };

export type PlanSection = {
  /** A feature section's id is its feature's slug (so each feature appears once, and the page can link to #slug). A section of the admin's own has "custom-...". */
  id: string;
  /** The feature this is about. Its icon, name and colour are the feature's own. */
  feature?: string;
  /** The name of a section that has no feature. */
  title?: string;
  /** A line or two under the name. */
  intro?: string;
  rows: PlanRow[];
};

export type PlansSettings = { prices: PlansPrices; sections: PlanSection[] };

/** The part of a feature the Plans page needs: enough to find its slug and the table on its page. */
type FeatureLike = { slug: string; blocks?: FeatureBlock[] };

export const defaultPrices = (): PlansPrices => ({ monthly: '£5.99', annual: '£59.90', annualNote: '2 months free' });

/** The lines of the Free / Pro table on a feature's own page (the first one, if it has several); none when it has no table. */
export function featurePlanRows(feature: FeatureLike): PlanRow[] {
  for (const b of feature.blocks ?? []) if (b.type === 'plans') return b.rows.map((r) => ({ ...r }));
  return [];
}

/** A section for each feature that has a table on its page, in the order given. */
export function defaultSections(features: FeatureLike[]): PlanSection[] {
  return features.flatMap((f): PlanSection[] => {
    const rows = featurePlanRows(f);
    return rows.length > 0 ? [{ id: f.slug, feature: f.slug, rows }] : [];
  });
}

const str = (v: unknown, max: number): string | undefined => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : undefined);

const CUSTOM_ID = /^custom-[a-z0-9-]{1,40}$/;

/** A key for a new section of the admin's own, never one already in use. */
export function newCustomId(sections: PlanSection[]): string {
  let n = 1;
  while (sections.some((s) => s.id === `custom-${n}`)) n++;
  return `custom-${n}`;
}

/**
 * Stored document + the features that exist (published ones, in the order the site lists them) -> the
 * prices and the sections to show. A section whose feature is gone is dropped, a feature is shown once,
 * and a section of the admin's own needs a title.
 */
export function resolvePlans(stored: unknown, features: FeatureLike[]): PlansSettings {
  const s = stored && typeof stored === 'object' ? (stored as Record<string, unknown>) : {};
  const p = s.prices && typeof s.prices === 'object' ? (s.prices as Record<string, unknown>) : {};
  const base = defaultPrices();
  const prices: PlansPrices = {
    monthly: str(p.monthly, PLANS_LIMITS.price) ?? base.monthly,
    annual: str(p.annual, PLANS_LIMITS.price) ?? base.annual,
    // The note may be cleared on purpose, so an empty one is kept as empty, not put back.
    annualNote: typeof p.annualNote === 'string' ? p.annualNote.trim().slice(0, PLANS_LIMITS.note) : base.annualNote,
  };

  if (!Array.isArray(s.sections)) return { prices, sections: defaultSections(features) };

  const known = new Set(features.map((f) => f.slug));
  const used = new Set<string>();
  const sections: PlanSection[] = [];
  for (const raw of s.sections) {
    if (sections.length >= PLANS_LIMITS.sections) break;
    if (!raw || typeof raw !== 'object') continue;
    const r = raw as Record<string, unknown>;
    const rows = readPlanRows(r.rows);
    const intro = str(r.intro, PLANS_LIMITS.intro);
    if (typeof r.feature === 'string') {
      if (!known.has(r.feature) || used.has(r.feature)) continue;
      used.add(r.feature);
      sections.push({ id: r.feature, feature: r.feature, ...(intro ? { intro } : {}), rows });
      continue;
    }
    const title = str(r.title, PLANS_LIMITS.title);
    const id = typeof r.id === 'string' && CUSTOM_ID.test(r.id) && !used.has(r.id) ? r.id : newCustomId(sections);
    if (!title) continue;
    used.add(id);
    sections.push({ id, title, ...(intro ? { intro } : {}), rows });
  }
  return { prices, sections };
}

/** What goes in the database: the settings without empty optional fields (Firestore refuses a field that is undefined), lines trimmed. */
export function storedPlans(settings: PlansSettings): Record<string, unknown> {
  return {
    prices: { monthly: settings.prices.monthly.trim(), annual: settings.prices.annual.trim(), annualNote: settings.prices.annualNote.trim() },
    sections: settings.sections.map((s) => ({
      id: s.id,
      ...(s.feature ? { feature: s.feature } : {}),
      ...(!s.feature && s.title?.trim() ? { title: s.title.trim() } : {}),
      ...(s.intro?.trim() ? { intro: s.intro.trim() } : {}),
      rows: s.rows.map((r) => ({ label: r.label.trim(), free: r.free.trim(), pro: r.pro.trim() })),
    })),
  };
}

/** Plain-English problems with a draft being saved (empty when fine). `nameOf` says what to call a section. */
export function validatePlans(settings: PlansSettings, nameOf: (section: PlanSection) => string): string[] {
  const problems: string[] = [];
  if (!settings.prices.monthly.trim()) problems.push('Pro monthly needs a price.');
  if (!settings.prices.annual.trim()) problems.push('Pro annual needs a price.');
  if (settings.sections.length > PLANS_LIMITS.sections) problems.push(`The page holds up to ${PLANS_LIMITS.sections} tables.`);
  for (const section of settings.sections) {
    const name = nameOf(section) || 'A table';
    if (!section.feature && !section.title?.trim()) problems.push('A table of your own needs a title.');
    if (section.rows.length === 0) problems.push(`${name} has no lines. Add one, or remove it.`);
    if (section.rows.length > SECTION_LIMITS.rows) problems.push(`${name} has more than ${SECTION_LIMITS.rows} lines.`);
    if (section.rows.some((row) => !row.label.trim())) problems.push(`${name} has a line with no name.`);
  }
  return [...new Set(problems)];
}
