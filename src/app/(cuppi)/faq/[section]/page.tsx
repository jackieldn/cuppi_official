import Link from 'next/link';
import { notFound } from 'next/navigation';
import { format } from 'date-fns';
import type { Metadata } from 'next';
import { CuppiFooter } from '@/components/cuppi/footer';
import { CuppiHeader } from '@/components/cuppi/header';
import { FaqEntryItem } from '@/components/faq/faq-entry';
import { FaqHelpCta } from '@/components/faq/faq-help-cta';
import { FaqSearch } from '@/components/faq/faq-search';
import { FaqSectionCard } from '@/components/faq/faq-section-card';
import { ExpandAllButton, FaqSectionEnhancer } from '@/components/faq/faq-section-tools';
import { FaqToc } from '@/components/faq/faq-toc';
import { JsonLd } from '@/components/faq/json-ld';
import { getFaqModel } from '@/lib/faq';
import { buildSectionJsonLd } from '@/lib/faq-jsonld';
import { faqMetadata } from '@/lib/faq-metadata';
import { findSection } from '@/lib/faq-model';
import { SITE_ORIGINS } from '@/lib/sites';

// Answers are edited in Sanity. Re-check them every minute.
export const revalidate = 60;

type Props = { params: Promise<{ section: string }> };

// Sections come from the content, so a topic added in Sanity is served on first
// request even though it was not built. If Sanity is unreachable at build time
// nothing is pre-built; pages are then generated on demand.
export async function generateStaticParams() {
  try {
    const model = await getFaqModel();
    return model.sections.map((s) => ({ section: s.id }));
  } catch (error) {
    console.error('Could not list FAQ sections at build time:', error);
    return [];
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { section: id } = await params;
  const section = findSection(await getFaqModel(), id);
  if (!section) return { title: 'Not found', robots: { index: false } };
  const count = section.entries.length;
  return faqMetadata({
    title: `${section.label} help and FAQs`,
    description: `${section.blurb ? `${section.blurb} ` : ''}${count} ${count === 1 ? 'answer' : 'answers'} from the Cuppi team.`,
    path: `/faq/${section.id}`,
  });
}

export default async function FaqSectionPage({ params }: Props) {
  const { section: id } = await params;
  const model = await getFaqModel();
  const section = findSection(model, id);
  if (!section) notFound();

  const count = section.entries.length;
  const at = model.sections.indexOf(section);
  const related = [model.sections[(at + 1) % model.sections.length], model.sections[(at + 2) % model.sections.length]].filter(
    (s, i, all) => s.id !== section.id && all.indexOf(s) === i,
  );

  return (
    <div className="bg-background text-foreground flex flex-col min-h-screen">
      <CuppiHeader />
      <main className="w-full flex flex-col items-center p-4 flex-grow">
        <div key={section.id} className="max-w-4xl mx-auto container px-4 pb-24 sm:pb-32 w-full">
          <header className="grid gap-3 border-b border-secondary pb-6">
            <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
              <ol className="flex flex-wrap items-center gap-x-1.5">
                <li>
                  <Link href="/faq" className="font-medium text-primary hover:underline">
                    FAQ
                  </Link>
                </li>
                <li aria-hidden="true">›</li>
                <li aria-current="page">{section.label}</li>
              </ol>
            </nav>
            <h1 className="font-headline text-4xl font-bold leading-tight sm:text-5xl">{section.label}</h1>
            {section.blurb && <p className="max-w-[62ch] text-lg text-muted-foreground">{section.blurb}</p>}
            <p className="text-sm tabular-nums text-muted-foreground">
              {count} {count === 1 ? 'answer' : 'answers'}
              {section.updatedAt ? ` · Updated ${format(new Date(section.updatedAt), 'd MMM yyyy')}` : ''}
            </p>
          </header>

          <div className="mt-6 grid items-start gap-6 md:grid-cols-[13rem_minmax(0,1fr)] md:gap-10">
            <FaqToc section={section} />

            <div className="min-w-0">
              <div className="mb-6 flex flex-wrap items-center gap-3">
                <div className="min-w-0 flex-1 basis-64">
                  <FaqSearch size="compact" placeholder={`Search all ${model.entries.length} answers`} />
                </div>
                <ExpandAllButton />
              </div>

              {section.topics.length > 0 ? (
                section.topics.map((topic) => (
                  <section key={topic.id} id={topic.id} data-faq-topic aria-labelledby={`${topic.id}-heading`} className="mt-8 scroll-mt-4 first:mt-0">
                    <h2 id={`${topic.id}-heading`} className="flex flex-wrap items-baseline gap-x-3 font-headline text-2xl font-bold">
                      {topic.label}
                      <span className="text-sm font-normal text-muted-foreground">
                        {topic.entries.length} {topic.entries.length === 1 ? 'answer' : 'answers'}
                      </span>
                    </h2>
                    <div className="mt-1">
                      {topic.entries.map((entry) => (
                        <FaqEntryItem key={entry.id} entry={entry} />
                      ))}
                    </div>
                  </section>
                ))
              ) : (
                <section aria-label={`${section.label} questions`}>
                  {section.entries.map((entry) => (
                    <FaqEntryItem key={entry.id} entry={entry} />
                  ))}
                </section>
              )}

              {related.length > 0 && (
                <section aria-labelledby="more-topics" className="mt-14">
                  <h2 id="more-topics" className="font-headline text-2xl font-bold">
                    More topics
                  </h2>
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    {related.map((s) => (
                      <FaqSectionCard key={s.id} section={s} />
                    ))}
                  </div>
                </section>
              )}

              <div className="mt-10">
                <FaqHelpCta />
              </div>
            </div>
          </div>
        </div>
      </main>
      <FaqSectionEnhancer />
      <JsonLd data={buildSectionJsonLd(section, SITE_ORIGINS.cuppi)} />
      <CuppiFooter />
    </div>
  );
}
