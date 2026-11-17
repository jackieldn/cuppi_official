import { getFaqModel } from './faq';
import { contentIds, NO_CONTENT, type ArticleCard, type FaqCard, type FeatureContent } from './feature-content-types';
import type { FeatureBlock } from './features-types';
import { sanityClient, urlFor } from './sanity-client';

// The words behind a feature page's "Articles" and "FAQs" sections. A section stores only Sanity ids; this looks
// them up. It never throws: if Sanity cannot be reached, the sections that needed it simply draw nothing, and the
// rest of the page is unharmed.

type RawArticle = {
  _id: string;
  _createdAt: string;
  title?: string | null;
  slug?: string | null;
  excerpt?: string | null;
  mainImage?: { asset?: { _id: string; url: string } | null; alt?: string | null } | null;
};

const ARTICLES_QUERY = `*[_type == "cosyCorner" && _id in $ids && defined(slug.current)] {
  _id,
  _createdAt,
  title,
  "slug": slug.current,
  excerpt,
  mainImage {
    asset->{ _id, url },
    alt
  }
}`;

async function getArticles(ids: string[]): Promise<Record<string, ArticleCard>> {
  if (ids.length === 0) return {};
  try {
    const raw = await sanityClient.fetch<RawArticle[]>(ARTICLES_QUERY, { ids });
    const out: Record<string, ArticleCard> = {};
    for (const a of raw) {
      if (!a.title || !a.slug) continue;
      out[a._id] = {
        id: a._id,
        slug: a.slug,
        title: a.title,
        ...(a.excerpt ? { excerpt: a.excerpt } : {}),
        date: a._createdAt,
        ...(a.mainImage?.asset ? { image: { url: urlFor(a.mainImage).width(900).quality(90).url(), alt: a.mainImage.alt || a.title } } : {}),
      };
    }
    return out;
  } catch (error) {
    console.error('Failed to fetch feature page articles:', error);
    return {};
  }
}

async function getFaqs(ids: string[]): Promise<Record<string, FaqCard>> {
  if (ids.length === 0) return {};
  try {
    // The whole FAQ model, not just these ids: an answer's anchor is worked out against all the others (see
    // buildFaqModel), and the model is cached per request and revalidated with the rest of the site.
    const model = await getFaqModel();
    const wanted = new Set(ids);
    const out: Record<string, FaqCard> = {};
    for (const e of model.entries) {
      if (wanted.has(e.id)) out[e.id] = { id: e.id, slug: e.slug, sectionId: e.sectionId, question: e.question, answer: e.answer };
    }
    return out;
  } catch (error) {
    console.error('Failed to fetch feature page FAQs:', error);
    return {};
  }
}

/** Looks up the articles and FAQs a page's sections point at. Fetches nothing when it has none. */
export async function getContentByIds(ids: { articles: string[]; faqs: string[] }): Promise<FeatureContent> {
  if (ids.articles.length === 0 && ids.faqs.length === 0) return NO_CONTENT;
  const [articles, faqs] = await Promise.all([getArticles(ids.articles), getFaqs(ids.faqs)]);
  return { articles, faqs };
}

export const getFeatureContent = (blocks: FeatureBlock[] | undefined): Promise<FeatureContent> => getContentByIds(contentIds(blocks));
