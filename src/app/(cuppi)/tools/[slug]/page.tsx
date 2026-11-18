import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowRight, Lock } from 'lucide-react';
import { CuppiFooter } from '@/components/cuppi/footer';
import { CuppiHeader } from '@/components/cuppi/header';
import { DownloadStrip } from '@/components/cuppi/blocks/download-strip';
import { FaqItem } from '@/components/cuppi/blocks/faq-item';
import { PageHero } from '@/components/cuppi/page-hero';
import { CALCULATORS } from '@/components/cuppi/tools/calculators';
import { ToolCard } from '@/components/cuppi/tools/tool-card';
import { ToolTile } from '@/components/cuppi/tools/tool-tile';
import { JsonLd } from '@/components/faq/json-ld';
import { Reveal } from '@/components/ui/reveal';
import { getTools } from '@/lib/cuppi-site-data';
import { getPageFeatures } from '@/lib/features';
import { SITE_ORIGINS } from '@/lib/sites';
import { TOOLS } from '@/lib/tools/registry';
import { TOOL_CONTENT } from '@/lib/tools/content';
import { buildToolJsonLd } from '@/lib/tools/seo';
import { liveTools } from '@/lib/tools/settings';

export const revalidate = 60;

type Params = { slug: string };

export const generateStaticParams = (): Params[] => TOOLS.map((t) => ({ slug: t.slug }));

/** The tool, if it exists, has a calculator and page, and the admin has it switched on. */
async function findTool(slug: string) {
  const tools = liveTools(await getTools());
  const tool = tools.find((t) => t.slug === slug);
  if (!tool || !CALCULATORS[slug] || !TOOL_CONTENT[slug]) return null;
  return { tool, tools };
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const found = await findTool((await params).slug);
  if (!found) return {};
  return {
    title: found.tool.seoTitle,
    description: found.tool.seoDescription,
    alternates: { canonical: `/tools/${found.tool.slug}` },
  };
}

export default async function ToolPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const found = await findTool(slug);
  if (!found) notFound();
  const { tool, tools } = found;
  const content = TOOL_CONTENT[slug];
  const Calculator = CALCULATORS[slug];
  const example = content.example();
  const related = content.related.map((s) => tools.find((t) => t.slug === s)).filter((t) => !!t);
  // Only point at the Cuppi feature if it has a page on the site right now.
  const feature = (await getPageFeatures()).find((f) => f.slug === content.cuppi.feature);

  return (
    <div className="flex min-h-screen flex-col overflow-x-clip bg-background text-foreground">
      <CuppiHeader />
      <JsonLd data={buildToolJsonLd(tool, content, SITE_ORIGINS.cuppi)} />
      <main className="flex-grow">
        <PageHero tint={tool.tint} back={{ href: '/tools', label: 'All tools' }} stackTile tile={<ToolTile tool={tool} className="h-16 w-16 shrink-0 sm:h-20 sm:w-20" />} title={content.heading} intro={content.intro}>
          <p className="inline-flex items-center gap-2 rounded-full bg-cuppi-paper/90 px-4 py-2 text-sm font-medium text-cuppi-ink">
            <Lock className="h-4 w-4" aria-hidden /> Runs on your device. Nothing you type is sent or saved.
          </p>
        </PageHero>

        <section aria-label={`${tool.name}`} className="mx-auto max-w-6xl px-3 pb-6 pt-6 sm:px-6">
          <Calculator />
          <p className="mx-auto mt-6 max-w-3xl px-2 text-center text-xs leading-relaxed text-cuppi-ink-soft">
            For illustration only. This is not financial advice, a quote or an offer of credit, and your own lender’s or the tax authority’s figures are the ones that count.
          </p>
        </section>

        <article className="mx-auto max-w-3xl px-5 py-10 sm:px-6">
          <h2 className="font-headline text-3xl font-normal tracking-tight">How it works</h2>
          <div className="mt-4 space-y-4 text-lg leading-relaxed text-cuppi-ink-soft">
            {content.how.map((p) => (
              <p key={p}>{p}</p>
            ))}
          </div>

          <div className="mt-10 rounded-[2rem] bg-cuppi-honey-soft p-6 sm:p-8">
            <p className="text-sm font-semibold text-cuppi-ink-soft">Worked example</p>
            <h2 className="mt-1 font-headline text-2xl font-normal">{example.heading}</h2>
            <div className="mt-3 space-y-3 leading-relaxed">
              {example.body.map((p) => (
                <p key={p}>{p}</p>
              ))}
            </div>
          </div>

          <h2 className="mt-12 font-headline text-3xl font-normal tracking-tight">What it does not include</h2>
          <ul className="mt-4 list-disc space-y-2 pl-5 text-lg leading-relaxed text-cuppi-ink-soft marker:text-cuppi-brand-deep">
            {content.limits.map((l) => (
              <li key={l}>{l}</li>
            ))}
          </ul>
        </article>

        <section className="mx-auto max-w-3xl px-3 pb-6 sm:px-6">
          <h2 className="px-2 pb-4 font-headline text-3xl font-normal tracking-tight">Questions people ask</h2>
          <div className="overflow-hidden rounded-[1.75rem] border border-cuppi-line bg-cuppi-card">
            {content.faqs.map((f) => (
              <FaqItem key={f.q} question={f.q}>
                <p className="max-w-prose leading-relaxed text-cuppi-ink-soft">{f.a}</p>
              </FaqItem>
            ))}
          </div>
        </section>

        {feature && (
          <Reveal className="mx-auto max-w-6xl px-3 pt-10 sm:px-6">
            <section className="flex flex-col gap-4 rounded-[2.5rem] bg-cuppi-moss-soft p-7 text-cuppi-ink sm:flex-row sm:items-center sm:justify-between sm:p-10">
              <div className="max-w-xl">
                <h2 className="font-headline text-2xl font-normal sm:text-3xl">{content.cuppi.title}</h2>
                <p className="mt-2 text-cuppi-ink-soft">{content.cuppi.body}</p>
              </div>
              <Link href={`/features/${feature.slug}`} className="group inline-flex shrink-0 items-center gap-2 font-semibold text-cuppi-brand-deep underline-offset-4 hover:underline">
                See {feature.name}
                <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" aria-hidden />
              </Link>
            </section>
          </Reveal>
        )}

        {related.length > 0 && (
          <section className="mx-auto max-w-6xl px-3 py-10 sm:px-6">
            <h2 className="px-4 pb-5 font-headline text-3xl font-normal tracking-tight sm:px-2">More tools</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {related.slice(0, 2).map((t) => (
                <ToolCard key={t.slug} tool={t} size="small" />
              ))}
            </div>
          </section>
        )}

        <DownloadStrip />
      </main>
      <CuppiFooter />
    </div>
  );
}
