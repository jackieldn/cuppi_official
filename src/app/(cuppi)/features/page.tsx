import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { CuppiFooter } from '@/components/cuppi/footer';
import { CuppiHeader } from '@/components/cuppi/header';
import { DownloadStrip } from '@/components/cuppi/blocks/download-strip';
import { Phone, Shapes } from '@/components/cuppi/blocks/phone';
import { TINTS } from '@/components/cuppi/blocks/tints';
import { FeatureGlyph } from '@/components/cuppi/feature-icon';
import { Reveal } from '@/components/ui/reveal';
import { getFeatures, groupFeatures } from '@/lib/features';
import { GROUP_LABELS, STATUS_LABELS } from '@/lib/features-types';
import { cn } from '@/lib/utils';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'Features',
  description: 'Everything Cuppi does for your home, from the Home Feed and Pets to Bin Day, Budget and Receipts.',
  alternates: { canonical: '/features' },
};

export default async function FeaturesPage() {
  const groups = groupFeatures(await getFeatures());

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <CuppiHeader />
      <main className="flex-grow">
        <section className="mx-auto max-w-4xl px-6 pb-10 pt-16 text-center sm:pt-24">
          <h1 className="cuppi-fade-up font-headline text-5xl font-semibold leading-[1.05] tracking-tight [font-variation-settings:'SOFT'_100] sm:text-7xl">
            Everything your home needs, <em className="text-cuppi-brand">gently</em> handled.
          </h1>
          <p className="cuppi-fade-up mx-auto mt-6 max-w-xl text-lg text-cuppi-ink-soft" style={{ '--d': '120ms' } as React.CSSProperties}>
            Save it once and Cuppi reminds you, calmly, for as long as you need. Pick a corner of home to explore.
          </p>
        </section>

        {groups.map(({ group, items }) => (
          <section key={group} className="mx-auto max-w-6xl px-3 py-6 sm:px-6">
            <Reveal className="flex items-baseline justify-between gap-4 px-4 pb-4 sm:px-2">
              <h2 className="font-headline text-2xl font-semibold [font-variation-settings:'SOFT'_100]">{GROUP_LABELS[group].title}</h2>
              <p className="text-cuppi-ink-soft">{GROUP_LABELS[group].blurb}</p>
            </Reveal>
            <div className="grid gap-4 sm:grid-cols-2">
              {items.map((f) => {
                const tint = TINTS[f.tint];
                const status = STATUS_LABELS[f.status];
                return (
                  <Reveal key={f.slug} stagger={100}>
                    <Link
                      href={`/features/${f.slug}`}
                      className={cn(
                        'group relative flex min-h-[26rem] flex-col overflow-hidden rounded-[2rem] p-7 transition-transform duration-500 [transition-timing-function:var(--ease-spring)] hover:-translate-y-1.5',
                        tint.surface,
                        tint.text,
                      )}
                    >
                      <Shapes shape={tint.shape} />
                      <div className="relative flex items-start justify-between gap-4">
                        <div>
                          <span className={cn('mb-4 grid h-11 w-11 place-items-center rounded-2xl', tint.dark ? 'bg-cuppi-paper/15' : tint.chip)}>
                            <FeatureGlyph icon={f.icon} className="h-5 w-5" />
                          </span>
                          <h3 className="flex items-center gap-2 font-headline text-3xl font-semibold [font-variation-settings:'SOFT'_100]">
                            {f.name}
                            {status && <span className="rounded-full bg-cuppi-paper/80 px-2.5 py-0.5 font-body text-xs font-semibold text-cuppi-ink">{status}</span>}
                          </h3>
                          <p className={cn('mt-1.5 max-w-xs', tint.muted)}>{f.tagline}</p>
                        </div>
                        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-cuppi-paper/70 text-cuppi-ink transition-transform duration-500 [transition-timing-function:var(--ease-spring)] group-hover:rotate-45 group-hover:bg-cuppi-paper">
                          <ArrowUpRight className="h-5 w-5" aria-hidden />
                        </span>
                      </div>
                      <div className="relative mt-4 flex-1">
                        {f.hero.imageStyle === 'wide' ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={f.hero.image.url} alt="" className="absolute bottom-4 left-1/2 w-[90%] -translate-x-1/2 transition-transform duration-700 [transition-timing-function:var(--ease-spring)] group-hover:scale-105" />
                        ) : (
                          <div className="absolute inset-0 transition-transform duration-700 [transition-timing-function:var(--ease-spring)] group-hover:-translate-y-3">
                            <Phone image={f.hero.image} sizes="(max-width: 640px) 80vw, 40vw" sink={4} className="rounded-[1.5rem]" />
                          </div>
                        )}
                      </div>
                    </Link>
                  </Reveal>
                );
              })}
            </div>
          </section>
        ))}

        <div className="pt-6">
          <DownloadStrip />
        </div>
      </main>
      <CuppiFooter />
    </div>
  );
}
