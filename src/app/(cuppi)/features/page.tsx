import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowUpRight } from 'lucide-react';
import { CuppiFooter } from '@/components/cuppi/footer';
import { CuppiHeader } from '@/components/cuppi/header';
import { DownloadStrip } from '@/components/cuppi/blocks/download-strip';
import { Phone } from '@/components/cuppi/blocks/phone';
import { TINTS } from '@/components/cuppi/blocks/tints';
import { AppTile } from '@/components/cuppi/feature-icon';
import { Reveal } from '@/components/ui/reveal';
import { getFeatures, groupFeatures } from '@/lib/features';
import { GROUP_LABELS, STATUS_LABELS, hasPage } from '@/lib/features-types';
import { cn } from '@/lib/utils';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'Features',
  description: 'Everything Cuppi does for your home, from Celebrations and Pets to Bin Day, Budget and Receipts.',
  alternates: { canonical: '/features' },
};

export default async function FeaturesPage() {
  const groups = groupFeatures(await getFeatures());

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <CuppiHeader />
      <main className="flex-grow">
        <section className="mx-auto max-w-4xl px-6 pb-10 pt-16 text-center sm:pt-24">
          <h1 className="cuppi-fade-up font-headline font-normal text-5xl leading-[1.05] tracking-tight sm:text-7xl">
            Everything your home needs, <em className="text-cuppi-brand">gently</em> handled.
          </h1>
          <p className="cuppi-fade-up mx-auto mt-6 max-w-xl text-lg text-cuppi-ink-soft" style={{ '--d': '120ms' } as React.CSSProperties}>
            Save it once and Cuppi reminds you, calmly, for as long as you need. Pick a corner of home to explore.
          </p>
        </section>

        {groups.map(({ group, items }) => {
          const pages = items.filter(hasPage);
          const soon = items.filter((f) => !hasPage(f));
          return (
            <section key={group} className="mx-auto max-w-6xl px-3 py-6 sm:px-6">
              <Reveal className="flex items-baseline justify-between gap-4 px-4 pb-4 sm:px-2">
                <h2 className="font-headline font-normal text-2xl">{GROUP_LABELS[group].title}</h2>
                <p className="hidden text-cuppi-ink-soft sm:block">{GROUP_LABELS[group].blurb}</p>
              </Reveal>

              <div className="grid gap-4 sm:grid-cols-2">
                {pages.map((f) => {
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
                        {/* The tile, with the name and the one line beside it, and the arrow at the far end. */}
                        <div className="relative flex items-center gap-4">
                          <AppTile feature={f} className="h-14 w-14 shrink-0" />
                          <div className="min-w-0 flex-1">
                            <h3 className="flex flex-wrap items-center gap-x-2 gap-y-1 font-headline font-normal text-3xl leading-tight">
                              {f.name}
                              {status && <span className="rounded-full bg-cuppi-paper/80 px-2.5 py-0.5 font-body text-xs font-semibold text-cuppi-ink">{status}</span>}
                            </h3>
                            <p className={cn('mt-0.5', tint.muted)}>{f.tagline}</p>
                          </div>
                          <span className="grid h-10 w-10 shrink-0 place-items-center self-start rounded-full bg-cuppi-paper/70 text-cuppi-ink transition-transform duration-500 [transition-timing-function:var(--ease-spring)] group-hover:rotate-45 group-hover:bg-cuppi-paper">
                            <ArrowUpRight className="h-5 w-5" aria-hidden />
                          </span>
                        </div>
                        {f.hero.image.fit === 'photo' && f.hero.imageStyle !== 'wide' ? (
                          // A photo fills the rest of the card in a rounded mask, with a margin round it so the card's colour frames it.
                          <div className="relative -mx-3 -mb-3 mt-5 min-h-[14rem] flex-1 overflow-hidden rounded-[1.25rem]">
                            <Image
                              src={f.hero.image.url}
                              alt=""
                              fill
                              sizes="(max-width: 640px) 100vw, 50vw"
                              className="object-cover transition-transform duration-700 [transition-timing-function:var(--ease-spring)] group-hover:scale-105"
                            />
                          </div>
                        ) : (
                        <div className="relative mt-4 flex-1">
                          {f.hero.imageStyle === 'wide' ? (
                            <Image
                              src={f.hero.image.url}
                              alt=""
                              width={1319}
                              height={1000}
                              sizes="(max-width: 640px) 80vw, 40vw"
                              className="absolute bottom-4 left-1/2 h-auto w-[90%] -translate-x-1/2 transition-transform duration-700 [transition-timing-function:var(--ease-spring)] group-hover:scale-105"
                            />
                          ) : (
                            <div className="absolute inset-0 transition-transform duration-700 [transition-timing-function:var(--ease-spring)] group-hover:-translate-y-3">
                              <Phone image={f.hero.image} sizes="(max-width: 640px) 80vw, 40vw" sink={4} className="rounded-[1.5rem]" />
                            </div>
                          )}
                        </div>
                        )}
                      </Link>
                    </Reveal>
                  );
                })}
              </div>

              {soon.length > 0 && (
                <Reveal className="mt-4">
                  <div className="flex flex-wrap items-center gap-x-6 gap-y-3 rounded-[1.75rem] border border-dashed border-cuppi-line px-6 py-4">
                    <p className="font-headline text-lg">Pages on their way</p>
                    {soon.map((f) => (
                      <span key={f.slug} className="flex items-center gap-2.5 font-medium text-cuppi-ink-soft">
                        <AppTile feature={f} muted className="h-9 w-9" />
                        {f.name}
                      </span>
                    ))}
                  </div>
                </Reveal>
              )}
            </section>
          );
        })}

        <div className="pt-6">
          <DownloadStrip />
        </div>
      </main>
      <CuppiFooter />
    </div>
  );
}
