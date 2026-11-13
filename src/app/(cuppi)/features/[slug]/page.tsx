import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { CuppiFooter } from '@/components/cuppi/footer';
import { CuppiHeader } from '@/components/cuppi/header';
import { BlockRenderer } from '@/components/cuppi/blocks/block-renderer';
import { DownloadStrip } from '@/components/cuppi/blocks/download-strip';
import { FeatureHero } from '@/components/cuppi/blocks/feature-hero';
import { KeepExploring } from '@/components/cuppi/blocks/keep-exploring';
import { getFeature, getPageFeatures } from '@/lib/features';
import { stripDisclaimers } from '@/lib/disclaimers';

export const revalidate = 60;

type Params = { slug: string };

export async function generateStaticParams(): Promise<Params[]> {
  return (await getPageFeatures()).map((f) => ({ slug: f.slug }));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const feature = await getFeature((await params).slug);
  if (!feature) return {};
  return {
    title: feature.name,
    description: stripDisclaimers(feature.hero.intro),
    alternates: { canonical: `/features/${feature.slug}` },
  };
}

export default async function FeaturePage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const [feature, all] = await Promise.all([getFeature(slug), getPageFeatures()]);
  if (!feature) notFound();

  // The next two features in order, wrapping round, so every page leads somewhere.
  const i = all.findIndex((f) => f.slug === feature.slug);
  const next = [1, 2].map((n) => all[(i + n) % all.length]).filter((f) => f.slug !== feature.slug);

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <CuppiHeader />
      <main className="flex-grow">
        <FeatureHero feature={feature} />
        <BlockRenderer blocks={feature.blocks} />
        <KeepExploring features={next} />
        <DownloadStrip />
      </main>
      <CuppiFooter />
    </div>
  );
}
