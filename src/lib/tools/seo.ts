// Structured data (schema.org) for a tool's page, for search engines and AI crawlers: the tool itself, where it
// sits in the site, and the questions on the page (the answer text is exactly what the page shows).
// Pure function with type-only imports, so the unit tests can load it from Node.

import type { ToolContent } from './content.ts';
import type { ToolDef } from './registry.ts';

export function buildToolJsonLd(tool: ToolDef, content: ToolContent, origin: string): Record<string, unknown> {
  const url = `${origin}/tools/${tool.slug}`;
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebApplication',
        name: tool.name,
        url,
        description: tool.seoDescription,
        applicationCategory: 'FinanceApplication',
        operatingSystem: 'Any',
        browserRequirements: 'Requires JavaScript',
        inLanguage: 'en-GB',
        isAccessibleForFree: true,
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'GBP' },
        publisher: { '@type': 'Organization', name: 'Cuppi', url: origin },
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Cuppi', item: origin },
          { '@type': 'ListItem', position: 2, name: 'Tools', item: `${origin}/tools` },
          { '@type': 'ListItem', position: 3, name: tool.name, item: url },
        ],
      },
      {
        '@type': 'FAQPage',
        mainEntity: content.faqs.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
      },
    ],
  };
}
