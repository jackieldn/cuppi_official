import { Check } from 'lucide-react';
import { Reveal } from '@/components/ui/reveal';
import type { FeatureBlock } from '@/lib/features-types';

type Points = Extract<FeatureBlock, { type: 'points' }>;

/** A few short reasons, no pictures. Reads like a list of promises. */
export function PointsBlock({ block }: { block: Points }) {
  return (
    <section className="mx-auto max-w-6xl px-3 py-10 sm:px-6">
      {block.title && (
        <Reveal className="px-4 pb-8 sm:px-6">
          <h2 className="font-headline text-3xl font-semibold tracking-tight [font-variation-settings:'SOFT'_100] sm:text-4xl">{block.title}</h2>
        </Reveal>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        {block.items.map((item) => (
          <Reveal key={item.title} stagger={90}>
            <div className="h-full rounded-[1.75rem] border border-cuppi-line bg-cuppi-card p-6 transition-transform duration-500 [transition-timing-function:var(--ease-spring)] hover:-translate-y-1">
              <span className="mb-4 grid h-9 w-9 place-items-center rounded-full bg-cuppi-moss-deep text-cuppi-paper">
                <Check className="h-4 w-4" aria-hidden />
              </span>
              <h3 className="font-headline text-xl font-semibold [font-variation-settings:'SOFT'_100]">{item.title}</h3>
              <p className="mt-2 leading-relaxed text-cuppi-ink-soft">{item.body}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
