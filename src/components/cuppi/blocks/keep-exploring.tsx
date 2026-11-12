import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Reveal } from '@/components/ui/reveal';
import type { Feature } from '@/lib/features-types';
import { FeatureGlyph } from '../feature-icon';
import { TINTS } from './tints';

/** Links to the next features, so a visitor never reaches a dead end. */
export function KeepExploring({ features }: { features: Feature[] }) {
  if (features.length === 0) return null;
  return (
    <section className="mx-auto max-w-6xl px-3 py-10 sm:px-6">
      <Reveal className="px-4 pb-6 sm:px-6">
        <h2 className="font-headline text-3xl font-semibold tracking-tight [font-variation-settings:'SOFT'_100]">Keep exploring</h2>
      </Reveal>
      <div className="grid gap-4 sm:grid-cols-2">
        {features.map((f) => {
          const tint = TINTS[f.tint];
          return (
            <Reveal key={f.slug} stagger={90}>
              <Link
                href={`/features/${f.slug}`}
                className={cn(
                  'group flex items-center gap-5 rounded-[1.75rem] p-5 transition-transform duration-500 [transition-timing-function:var(--ease-spring)] hover:-translate-y-1',
                  tint.surface,
                  tint.text,
                )}
              >
                <span className={cn('grid h-14 w-14 shrink-0 place-items-center rounded-2xl', tint.dark ? 'bg-cuppi-paper/15' : tint.chip)}>
                  <FeatureGlyph icon={f.icon} className="h-6 w-6" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-headline text-xl font-semibold [font-variation-settings:'SOFT'_100]">{f.name}</span>
                  <span className={cn('block truncate', tint.muted)}>{f.tagline}</span>
                </span>
                <ArrowUpRight className="h-5 w-5 shrink-0 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden />
              </Link>
            </Reveal>
          );
        })}
      </div>
    </section>
  );
}
