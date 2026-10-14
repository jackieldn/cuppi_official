import { serializeJsonLd } from '@/lib/faq-jsonld';

/** Structured data for search engines and AI crawlers. */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }} />;
}
