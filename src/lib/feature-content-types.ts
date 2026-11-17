// What the "Articles" and "FAQs" sections of a feature page show, once it has been looked up in Sanity.
//
// A section stores only the Sanity ids it points at (see FeatureBlock in features-types.ts). The words, pictures and
// links come from Sanity each time the page is built, so editing an article or an FAQ there updates every page that
// shows it. The lookup is feature-content.ts (server only); this file is plain types and helpers with no imports of
// substance, so the page, the admin preview and the tests can all use it.

import type { FeatureBlock } from './features-types.ts';

/** One Cosy Corner article, as a card needs it. */
export type ArticleCard = {
  /** Sanity id. */
  id: string;
  /** Current slug: the article is at /blog/<slug>. */
  slug: string;
  title: string;
  excerpt?: string;
  /** ISO date it was published. */
  date: string;
  /** A ready-to-use picture address, already sized. */
  image?: { url: string; alt: string };
};

/** One FAQ, as a section needs it. */
export type FaqCard = {
  /** Sanity id. */
  id: string;
  /** Its anchor on its FAQ page: /faq/<sectionId>#<slug>. */
  slug: string;
  sectionId: string;
  question: string;
  /** Portable Text, drawn by the page. */
  answer: any[];
};

/** Everything the pick sections of one page need, by Sanity id. An id that is missing was deleted or hidden in Sanity. */
export type FeatureContent = { articles: Record<string, ArticleCard>; faqs: Record<string, FaqCard> };

export const NO_CONTENT: FeatureContent = { articles: {}, faqs: {} };

/** The Sanity ids a list of sections points at, so one lookup can fetch them all. */
export function contentIds(blocks: FeatureBlock[] | undefined): { articles: string[]; faqs: string[] } {
  const articles = new Set<string>();
  const faqs = new Set<string>();
  for (const b of blocks ?? []) {
    if (b.type === 'articles') b.ids.forEach((id) => articles.add(id));
    if (b.type === 'faqs') b.ids.forEach((id) => faqs.add(id));
  }
  return { articles: [...articles], faqs: [...faqs] };
}

/** The items for a section's ids, in the section's order. An id with nothing behind it is left out. */
export function pick<T>(ids: readonly string[], byId: Record<string, T> | undefined): T[] {
  if (!byId) return [];
  return ids.flatMap((id) => (Object.prototype.hasOwnProperty.call(byId, id) ? [byId[id]] : []));
}
