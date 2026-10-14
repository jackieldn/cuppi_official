import Link from 'next/link';
import type { Metadata } from 'next';
import { CuppiFooter } from '@/components/cuppi/footer';
import { CuppiHeader } from '@/components/cuppi/header';
import { FaqHelpCta } from '@/components/faq/faq-help-cta';
import { FaqSearch } from '@/components/faq/faq-search';
import { Highlight } from '@/components/faq/highlight';
import { getFaqModel, toSearchDocs } from '@/lib/faq';
import { buildSearchIndex, searchFaq, snippet } from '@/lib/faq-search';

type Props = { searchParams: Promise<{ q?: string | string[] }> };

const MAX_RESULTS = 30;
const MAX_QUERY_LENGTH = 100;

// Search results are for people, not search engines: pages with ?q= are not indexed.
export const metadata: Metadata = {
  title: 'Search the FAQ',
  robots: { index: false, follow: true },
};

export default async function FaqSearchPage({ searchParams }: Props) {
  const { q } = await searchParams;
  const query = (Array.isArray(q) ? q[0] : q ?? '').replace(/\s+/g, ' ').trim().slice(0, MAX_QUERY_LENGTH);

  const model = await getFaqModel();
  const outcome = query ? searchFaq(buildSearchIndex(toSearchDocs(model)), query, MAX_RESULTS) : null;

  return (
    <div className="bg-background text-foreground flex flex-col min-h-screen">
      <CuppiHeader />
      <main className="w-full flex flex-col items-center p-4 flex-grow">
        <div className="max-w-4xl mx-auto container px-4 pb-24 sm:pb-32 w-full">
          <header className="grid gap-4 pb-6">
            <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
              <Link href="/faq" className="font-medium text-primary hover:underline">
                FAQ
              </Link>{' '}
              › Search
            </nav>
            <h1 className="font-headline text-4xl font-bold leading-tight sm:text-5xl">Search results</h1>
            <FaqSearch defaultValue={query} placeholder={`Search ${model.entries.length} answers`} />
          </header>

          {!outcome && <p className="text-muted-foreground">Type a word or two above to search every question and answer.</p>}

          {outcome && outcome.results.length === 0 && (
            <div className="grid gap-4 rounded-2xl border border-dashed bg-card p-6">
              <h2 className="font-headline text-2xl font-bold">No answers match “{query}”</h2>
              <p className="text-muted-foreground">Try fewer or simpler words, or browse a topic.</p>
              <ul className="flex flex-wrap gap-2">
                {model.sections.map((s) => (
                  <li key={s.id}>
                    <Link href={`/faq/${s.id}`} className="inline-block rounded-full border bg-background px-3.5 py-1.5 text-sm font-medium hover:border-primary hover:text-primary">
                      {s.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {outcome && outcome.results.length > 0 && (
            <section aria-labelledby="results-heading">
              <h2 id="results-heading" className="text-sm text-muted-foreground">
                {outcome.partial ? 'No answer has every word. Showing ' : ''}
                {outcome.results.length === MAX_RESULTS ? `the best ${MAX_RESULTS} results` : `${outcome.results.length} ${outcome.results.length === 1 ? 'result' : 'results'}`} for “{query}”
              </h2>
              <ol className="mt-2">
                {outcome.results.map(({ doc }) => (
                  <li key={doc.slug} className="border-b border-secondary">
                    <Link href={`/faq/${doc.sectionId}#${doc.slug}`} className="group grid gap-0.5 px-1 py-4">
                      <span className="text-xs font-medium text-muted-foreground">
                        {doc.sectionLabel}
                        {doc.topic ? ` › ${doc.topic}` : ''}
                      </span>
                      <span className="text-lg font-semibold leading-snug group-hover:text-primary">
                        <Highlight text={doc.question} terms={outcome.terms} />
                      </span>
                      <span className="max-w-[75ch] text-sm text-foreground/80">
                        <Highlight text={snippet(doc.text, outcome.terms)} terms={outcome.terms} />
                      </span>
                    </Link>
                  </li>
                ))}
              </ol>
            </section>
          )}

          <div className="mt-12">
            <FaqHelpCta />
          </div>
        </div>
      </main>
      <CuppiFooter />
    </div>
  );
}
