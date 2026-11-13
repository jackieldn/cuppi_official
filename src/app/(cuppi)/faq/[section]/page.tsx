import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { CuppiFooter } from '@/components/cuppi/footer';
import { CuppiHeader } from '@/components/cuppi/header';
import { AppTile } from '@/components/cuppi/feature-icon';
import { PageHero } from '@/components/cuppi/page-hero';
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
import { getFeatures } from '@/lib/features';
import { faqTile, TINT_FOR_TILE } from '@/lib/faq-visuals';
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

  const features = await getFeatures();
  const tile = faqTile(section.id, features);

  return (
    <div className="bg-background text-foreground flex flex-col min-h-screen">
      <CuppiHeader />
      <main className="flex-grow">
        <PageHero
          tint={TINT_FOR_TILE[tile.tile]}
          back={{ href: '/faq', label: 'All help' }}
          tile={<AppTile feature={{ ...tile, name: section.label }} className="h-16 w-16 sm:h-20 sm:w-20" />}
          title={section.label}
          intro={section.blurb || undefined}
        />

        <div key={section.id} className="mx-auto w-full max-w-6xl px-3 pb-24 sm:px-6 sm:pb-32">
          <div className="mt-10 grid items-start gap-6 md:grid-cols-[14rem_minmax(0,1fr)] md:gap-12">
            <FaqToc section={section} />

            <div className="min-w-0">
              <div className="mb-8 flex flex-wrap items-center gap-3">
                <div className="min-w-0 flex-1 basis-64">
                  <FaqSearch size="compact" placeholder={`Search all ${model.entries.length} answers`} />
                </div>
                <ExpandAllButton />
              </div>

              {section.topics.length > 0 ? (
                section.topics.map((topic) => (
                  <section key={topic.id} id={topic.id} data-faq-topic aria-labelledby={`${topic.id}-heading`} className="mt-14 scroll-mt-24 first:mt-0">
                    <h2 id={`${topic.id}-heading`} className="flex flex-wrap items-baseline gap-x-3 font-headline text-3xl">
                      {topic.label}
                      <span className="font-body text-sm text-cuppi-ink-soft">
                        {topic.entries.length} {topic.entries.length === 1 ? 'answer' : 'answers'}
                      </span>
                    </h2>
                    <div className="mt-2">
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
                <section aria-labelledby="more-topics" className="mt-20">
                  <h2 id="more-topics" className="font-headline text-3xl">
                    More topics
                  </h2>
                  <div className="mt-6 grid gap-4 sm:grid-cols-2">
                    {related.map((s) => (
                      <FaqSectionCard key={s.id} section={s} tile={faqTile(s.id, features)} />
                    ))}
                  </div>
                </section>
              )}

              <div className="mt-16">
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
