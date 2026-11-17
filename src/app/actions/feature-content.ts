'use server';

import { getFaqModel } from '@/lib/faq';
import { getContentByIds } from '@/lib/feature-content';
import type { FeatureContent } from '@/lib/feature-content-types';
import { readContentIds, SECTION_LIMITS } from '@/lib/feature-sections';
import { sanityClient } from '@/lib/sanity-client';

// Used by the feature page builder in the admin, which runs in the browser and so cannot look things up itself:
// the picker needs the list of articles and FAQs to choose from, and the preview needs the chosen ones' words.
// Everything here is what the public site already shows, so it needs no sign-in.

export type ContentChoices = {
  articles: { id: string; title: string; date: string }[];
  faqs: { id: string; question: string; section: string }[];
};

/** Every article and FAQ that can be picked, newest article first and FAQs in their FAQ-page order. Null if Sanity could not be reached. */
export async function listContentChoices(): Promise<ContentChoices | null> {
  try {
    const [articles, model] = await Promise.all([
      sanityClient.fetch<{ _id: string; _createdAt: string; title?: string | null }[]>(
        `*[_type == "cosyCorner" && defined(slug.current)] | order(_createdAt desc) { _id, _createdAt, title }`,
      ),
      getFaqModel(),
    ]);
    return {
      articles: articles.filter((a) => a.title).map((a) => ({ id: a._id, title: a.title as string, date: a._createdAt })),
      faqs: model.sections.flatMap((s) => s.entries.map((e) => ({ id: e.id, question: e.question, section: s.label }))),
    };
  } catch (error) {
    console.error('Failed to list articles and FAQs for the page builder:', error);
    return null;
  }
}

/** The words, pictures and links for the picked articles and FAQs, for the builder's preview. Bad input gets nothing back. */
export async function loadFeatureContent(input: unknown): Promise<FeatureContent> {
  const r = input && typeof input === 'object' ? (input as Record<string, unknown>) : {};
  // A page holds at most 30 sections, each with a handful of picks; this is only a ceiling on what one call may ask for.
  const articles = readContentIds(r.articles, SECTION_LIMITS.sections * SECTION_LIMITS.articles);
  const faqs = readContentIds(r.faqs, SECTION_LIMITS.sections * SECTION_LIMITS.faqs);
  return getContentByIds({ articles, faqs });
}
