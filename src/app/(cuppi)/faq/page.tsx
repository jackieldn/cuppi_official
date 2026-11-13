import Link from 'next/link';
import { format } from 'date-fns';
import type { Metadata } from 'next';
import { CuppiFooter } from '@/components/cuppi/footer';
import { CuppiHeader } from '@/components/cuppi/header';
import { SpotlightPattern } from '@/components/cuppi/spotlight-pattern';
import { FaqSearch } from '@/components/faq/faq-search';
import { FaqSectionCard } from '@/components/faq/faq-section-card';
import { FaqHelpCta } from '@/components/faq/faq-help-cta';
import { JsonLd } from '@/components/faq/json-ld';
import { ArrowUpRight, ChevronDown } from 'lucide-react';
import { getFaqModel } from '@/lib/faq';
import { getFeatures } from '@/lib/features';
import { faqTile } from '@/lib/faq-visuals';
import { buildHubJsonLd } from '@/lib/faq-jsonld';
import { faqMetadata } from '@/lib/faq-metadata';
import { entryPath } from '@/lib/faq-model';
import { SITE_ORIGINS } from '@/lib/sites';

// Answers are edited in Sanity. Re-check them every minute.
export const revalidate = 60;

const SUGGESTED_SEARCHES = ['bin day', 'cancel pro', 'referral code', 'child account'];

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
  const features = await getFeatures();
  const total = model.entries.length;

  return (
    <div className="bg-background text-foreground flex flex-col min-h-screen">
      <CuppiHeader />
      <main className="flex-grow">
        {/* One question, one search box, and room to breathe. */}
        <section className="px-3 pt-3 sm:px-6">
          <div className="relative mx-auto max-w-6xl overflow-hidden rounded-[2.5rem] bg-cuppi-sky-soft px-6 py-16 text-center sm:py-24">
            <SpotlightPattern pattern="summerTea" focus="50% 55%" shape="ellipse" spot={0.5} />
            <div className="relative">
            <h1 className="cuppi-fade-up font-headline text-5xl font-normal leading-[1.05] tracking-tight sm:text-7xl">
              How can we <em className="text-cuppi-brand">help?</em>
            </h1>
            <p className="cuppi-fade-up mx-auto mt-5 max-w-md text-lg text-cuppi-ink-soft" style={{ '--d': '100ms' } as React.CSSProperties}>
              Search the answers, or pick a topic below.
            </p>
            <div className="cuppi-fade-up relative z-20 mx-auto mt-10 max-w-2xl text-left" style={{ '--d': '200ms' } as React.CSSProperties}>
              <FaqSearch placeholder={`Search ${total} answers`} />
            </div>
            <div
              className="cuppi-fade-up mt-6 flex flex-wrap items-center justify-center gap-2"
              aria-label="Suggested searches"
              style={{ '--d': '300ms' } as React.CSSProperties}
            >
              <span className="mr-1 text-sm text-cuppi-ink-soft">Try</span>
              {SUGGESTED_SEARCHES.map((term) => (
                <Link
                  key={term}
                  href={`/faq/search?q=${encodeURIComponent(term)}`}
                  rel="nofollow"
                  prefetch={false}
                  className="rounded-full bg-cuppi-paper/80 px-4 py-1.5 text-sm font-medium transition-colors hover:bg-cuppi-paper"
                >
                  {term}
                </Link>
              ))}
            </div>
            </div>
          </div>
        </section>

        <div className="mx-auto w-full max-w-6xl px-3 pb-24 sm:px-6 sm:pb-32">
          {model.popular.length > 0 && (
            <section aria-labelledby="popular-questions" className="mt-20">
              <h2 id="popular-questions" className="px-2 font-headline text-3xl sm:text-4xl">
                Popular questions
              </h2>
              <ul className="mt-6 grid gap-x-10 sm:grid-cols-2">
                {model.popular.map((entry) => (
                  <li key={entry.id} className="border-b border-cuppi-line">
                    <Link href={entryPath(entry)} className="group flex items-center justify-between gap-4 px-2 py-5 text-lg">
                      <span className="leading-snug transition-colors group-hover:text-cuppi-brand-deep">{entry.question}</span>
                      <ArrowUpRight
                        aria-hidden="true"
                        className="h-5 w-5 shrink-0 text-cuppi-ink-soft transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                      />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {model.groups.map((group, i) => (
            <section key={group.label} aria-labelledby={`group-${i}`} className="mt-20">
              <h2 id={`group-${i}`} className="px-2 font-headline text-3xl sm:text-4xl">
                {group.label}
              </h2>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                {group.sections.map((section) => (
                  <FaqSectionCard key={section.id} section={section} tile={faqTile(section.id, features)} />
                ))}
              </div>
            </section>
          ))}

          <div className="mt-24">
            <FaqHelpCta />
          </div>

          {/* Every question as a plain link: one place that reaches all answers. Closed by default, so it adds no clutter. */}
          <details className="group mt-10">
            <summary className="flex cursor-pointer list-none items-center justify-center gap-2 py-4 text-sm font-semibold text-cuppi-ink-soft hover:text-cuppi-brand-deep [&::-webkit-details-marker]:hidden">
              Browse all {total} questions
              <ChevronDown aria-hidden="true" className="h-4 w-4 transition-transform group-open:rotate-180" />
            </summary>
            <div className="gap-x-10 border-t border-cuppi-line pt-6 sm:columns-2">
              {model.sections.map((section) => (
                <div key={section.id} className="mb-6 break-inside-avoid">
                  <h3 className="mb-1 font-headline text-lg">
                    <Link href={`/faq/${section.id}`} className="hover:text-cuppi-brand-deep">
                      {section.label}
                    </Link>
                  </h3>
                  <ul>
                    {section.entries.map((entry) => (
                      <li key={entry.id}>
                        <Link href={entryPath(entry)} className="block py-0.5 text-sm text-cuppi-ink-soft hover:text-cuppi-brand-deep hover:underline">
                          {entry.question}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            {model.updatedAt && (
              <p className="pt-2 text-center text-xs text-cuppi-ink-soft">Answers last updated {format(new Date(model.updatedAt), 'd MMM yyyy')}.</p>
            )}
          </details>
        </div>
      </main>
      <JsonLd data={buildHubJsonLd(model, SITE_ORIGINS.cuppi)} />
      <CuppiFooter />
    </div>
  );
}
