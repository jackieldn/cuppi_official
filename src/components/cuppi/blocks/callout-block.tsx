import { cn } from '@/lib/utils';
import { Reveal } from '@/components/ui/reveal';
import type { FeatureBlock } from '@/lib/features-types';
import { TINTS } from './tints';

type Callout = Extract<FeatureBlock, { type: 'callout' }>;

/** One big warm sentence on a colour band. The page's deep breath. */
export function CalloutBlock({ block }: { block: Callout }) {
  const tint = TINTS[block.tint];
  return (
    <Reveal className="px-3 py-3 sm:px-6">
      <section className={cn('relative mx-auto max-w-6xl overflow-hidden rounded-[2.5rem] px-7 py-16 text-center sm:px-16 sm:py-24', tint.surface, tint.text)}>
        <p className="relative mx-auto max-w-3xl font-headline font-normal text-3xl italic leading-snug tracking-tight sm:text-5xl sm:leading-tight">
          {block.title}
        </p>
        {block.body && <p className={cn('relative mx-auto mt-5 max-w-xl text-lg', tint.muted)}>{block.body}</p>}
      </section>
    </Reveal>
  );
}
