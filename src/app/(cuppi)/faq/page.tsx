import Link from 'next/link';
import { format } from 'date-fns';
import type { Metadata } from 'next';
import { CuppiFooter } from '@/components/cuppi/footer';
import { CuppiHeader } from '@/components/cuppi/header';
import { FaqSearch } from '@/components/faq/faq-search';
import { FaqSectionCard } from '@/components/faq/faq-section-card';
import { FaqHelpCta } from '@/components/faq/faq-help-cta';
import { JsonLd } from '@/components/faq/json-ld';
import { ChevronDown } from 'lucide-react';
import { getFaqModel } from '@/lib/faq';
import { buildHubJsonLd } from '@/lib/faq-jsonld';
import { faqMetadata } from '@/lib/faq-metadata';
import { entryPath } from '@/lib/faq-model';
import { SITE_ORIGINS } from '@/lib/sites';

// Answers are edited in Sanity. Re-check them every minute.
export const revalidate = 60;

const SUGGESTED_SEARCHES = ['bin day', 'cancel pro', 'referral code', 'budget approval', 'receipt pdf', 'child account'];

export async function generateMetadata(): Promise<Metadata> {
  const model = await getFaqModel();
  return faqMetadata({
    title: 'Cuppi help and FAQs',
    description: `${model.entries.length} answers about using Cuppi: household, bin day, budget, receipts, pets, shopping and more. Search or browse by topic.`,
    path: '/faq',
  });
}

export default async function FaqPage() {
  const model = await getFaqModel();
  const total = model.entries.length;

  return (
    <div className="bg-background text-foreground flex flex-col min-h-screen">
      <CuppiHeader />
      <main className="w-full flex flex-col items-center p-4 flex-grow">
        <div className="max-w-4xl mx-auto container px-4 pb-24 sm:pb-32 w-full">
          <header className="grid gap-4 pb-10">
            <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Frequently asked questions</p>
            <h1 className="font-headline text-4xl font-bold leading-tight sm:text-5xl">How can we help?</h1>
            <p className="max-w-[60ch] text-lg text-muted-foreground">
              {total} answers across {model.sections.length} topics
              {model.updatedAt ? `. Updated ${format(new Date(model.updatedAt), 'd MMM yyyy')}.` : '.'}
            </p>
            <FaqSearch placeholder={`Search ${total} answers, e.g. “bin day”, “refund”, “PIN”`} />
            <div className="flex flex-wrap items-center gap-2" aria-label="Suggested searches">
              <span className="mr-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Try</span>
              {SUGGESTED_SEARCHES.map((term) => (
                <Link
                  key={term}
                  href={`/faq/search?q=${encodeURIComponent(term)}`}
                  rel="nofollow"
                  prefetch={false}
                  className="rounded-full border bg-card px-3.5 py-1.5 text-sm font-medium transition-colors hover:border-primary hover:text-primary"
                >
                  {term}
                </Link>
              ))}
            </div>
          </header>

          {model.popular.length > 0 && (
            <section aria-labelledby="popular-questions">
              <h2 id="popular-questions" className="font-headline text-2xl font-bold">
                Popular questions
              </h2>
              <ul className="mt-3 grid gap-x-8 sm:grid-cols-2">
                {model.popular.map((entry) => (
                  <li key={entry.id} className="border-b border-secondary">
                    <Link href={entryPath(entry)} className="group flex flex-col gap-0.5 py-3.5">
                      <span className="font-semibold leading-snug group-hover:text-primary">{entry.question}</span>
                      <span className="text-sm text-muted-foreground">{model.sections.find((s) => s.id === entry.sectionId)?.label}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {model.groups.map((group, i) => (
            <section key={group.label} aria-labelledby={`group-${i}`} className="mt-12">
              <h2 id={`group-${i}`} className="font-headline text-2xl font-bold">
                {group.label}
              </h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {group.sections.map((section) => (
                  <FaqSectionCard key={section.id} section={section} />
                ))}
              </div>
            </section>
          ))}

          <div className="mt-12">
            <FaqHelpCta />
          </div>

          {/* Every question as a plain link: one place that reaches all answers. */}
          <details className="group mt-8 border-t border-secondary">
            <summary className="flex cursor-pointer list-none items-center justify-between py-4 font-semibold [&::-webkit-details-marker]:hidden">
              Browse all {total} questions
              <ChevronDown aria-hidden="true" className="h-5 w-5 text-muted-foreground transition-transform group-open:rotate-180" />
            </summary>
            <div className="gap-x-10 pb-4 sm:columns-2">
              {model.sections.map((section) => (
                <div key={section.id} className="mb-5 break-inside-avoid">
                  <h3 className="mb-1 font-headline text-base font-bold">
                    <Link href={`/faq/${section.id}`} className="hover:text-primary">
                      {section.label}
                    </Link>
                  </h3>
                  <ul>
                    {section.entries.map((entry) => (
                      <li key={entry.id}>
                        <Link href={entryPath(entry)} className="block py-0.5 text-sm text-foreground/80 hover:text-primary hover:underline">
                          {entry.question}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </details>
        </div>
      </main>
      <JsonLd data={buildHubJsonLd(model, SITE_ORIGINS.cuppi)} />
      <CuppiFooter />
    </div>
  );
}
