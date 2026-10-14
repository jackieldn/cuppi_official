// schema.org structured data for the FAQ pages. Answer text is exactly the text
// shown on the page (search engines compare the two). Google no longer shows FAQ
// rich results for most sites; this is a clean machine-readable copy.
//
// Pure functions: types only, no imports of values.

import type { FaqEntry, FaqModel, FaqSection } from './faq-model';

type Json = Record<string, unknown>;

function breadcrumb(origin: string, trail: { name: string; path?: string }[]): Json {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((t, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: t.name,
      ...(t.path ? { item: `${origin}${t.path}` } : {}),
    })),
  };
}

function answerText(entry: FaqEntry): string {
  const parts = [entry.plain, ...entry.videoUrls.map((u) => `Video walkthrough: ${u}`)].filter(Boolean);
  return parts.join('\n');
}

export function buildSectionJsonLd(section: FaqSection, origin: string): Json {
  const url = `${origin}/faq/${section.id}`;
  return {
    '@context': 'https://schema.org',
    '@graph': [
      breadcrumb(origin, [
        { name: 'Cuppi', path: '/' },
        { name: 'FAQ', path: '/faq' },
        { name: section.label },
      ]),
      {
        '@type': 'FAQPage',
        '@id': `${url}#faq`,
        url,
        name: `${section.label} help and FAQs`,
        inLanguage: 'en-GB',
        dateModified: section.updatedAt || undefined,
        mainEntity: section.entries.map((e) => ({
          '@type': 'Question',
          '@id': `${url}#${e.slug}`,
          name: e.question,
          acceptedAnswer: { '@type': 'Answer', text: answerText(e) },
        })),
      },
    ],
  };
}

export function buildHubJsonLd(model: FaqModel, origin: string): Json {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      breadcrumb(origin, [{ name: 'Cuppi', path: '/' }, { name: 'FAQ' }]),
      {
        '@type': 'CollectionPage',
        '@id': `${origin}/faq#page`,
        url: `${origin}/faq`,
        name: 'Cuppi help and FAQs',
        inLanguage: 'en-GB',
        dateModified: model.updatedAt || undefined,
        mainEntity: {
          '@type': 'ItemList',
          itemListElement: model.sections.map((s, i) => ({
            '@type': 'ListItem',
            position: i + 1,
            name: s.label,
            url: `${origin}/faq/${s.id}`,
          })),
        },
      },
    ],
  };
}

/** JSON for a <script type="application/ld+json"> tag. `<` is escaped so content can never close the tag. */
export function serializeJsonLd(data: Json): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}
