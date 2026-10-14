import { getFaqModel, toSearchDocs } from '@/lib/faq';

// What the FAQ search box downloads the first time it is used: every question
// with its answer as plain text. Rebuilt at most once a minute, like the pages.
export const revalidate = 60;

export async function GET() {
  const model = await getFaqModel();
  return Response.json(toSearchDocs(model), {
    // It is data for the search box, not a page for search engines.
    headers: { 'X-Robots-Tag': 'noindex' },
  });
}
