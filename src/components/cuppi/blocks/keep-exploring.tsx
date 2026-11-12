import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Reveal } from '@/components/ui/reveal';
import type { PageFeature } from '@/lib/features-types';
import { AppTile } from '../feature-icon';
import { TINTS } from './tints';

/** Links to the next features, so a visitor never reaches a dead end. */
export function KeepExploring({ features }: { features: PageFeature[] }) {
  if (features.length === 0) return null;
  return (
    <section className="mx-auto max-w-6xl px-3 py-10 sm:px-6">
      <Reveal className="px-4 pb-6 sm:px-6">
        <h2 className="font-headline font-normal text-3xl tracking-tight">Keep exploring</h2>
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
                <AppTile feature={f} className="h-14 w-14" />
                <span className="min-w-0 flex-1">
                  <span className="block font-headline font-normal text-xl">{f.name}</span>
                  <span className={cn('block', tint.muted)}>{f.tagline}</span>
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
