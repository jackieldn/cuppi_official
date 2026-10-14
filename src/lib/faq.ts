import { cache } from 'react';
import { sanityClient } from '@/lib/sanity-client';
import { FAQ_GROUP_ORDER, FAQ_RESERVED_SECTION_IDS, FAQ_SECTIONS } from '@/lib/faq-config';
import { FAQ_LAYOUT, FAQ_POPULAR_IDS } from '@/lib/faq-layout';
import { buildFaqModel, type FaqModel, type RawFaq } from '@/lib/faq-model';
import type { SearchDoc } from '@/lib/faq-search';

// `topic`, `slug` and `featured` are optional Studio fields. Querying a field a
// document does not have returns null, so this works before they exist.
const FAQ_QUERY = `*[_type == "faq"] | order(order asc, _createdAt asc) {
  _id,
  _createdAt,
  _updatedAt,
  question,
  answer,
  category,
  order,
  topic,
  "slug": slug.current,
  featured
}`;

/**
 * Every FAQ, grouped into topic pages. Cached per request, so the page and its
 * metadata share one fetch. Throws if Sanity cannot be reached, which keeps the
 * last good page being served while a revalidation fails.
 */
export const getFaqModel = cache(async (): Promise<FaqModel> => {
  const raw = await sanityClient.fetch<RawFaq[]>(FAQ_QUERY);
  return buildFaqModel(raw, {
    sections: FAQ_SECTIONS,
    groupOrder: FAQ_GROUP_ORDER,
    layout: FAQ_LAYOUT,
    popularIds: FAQ_POPULAR_IDS,
    reservedSectionIds: FAQ_RESERVED_SECTION_IDS,
  });
});

export function toSearchDocs(model: FaqModel): SearchDoc[] {
  return model.sections.flatMap((section) =>
    section.entries.map((e) => ({
      slug: e.slug,
      sectionId: section.id,
      sectionLabel: section.label,
      topic: e.topic,
      question: e.question,
      text: e.plain.replace(/\s+/g, ' ').trim(),
    })),
  );
}
