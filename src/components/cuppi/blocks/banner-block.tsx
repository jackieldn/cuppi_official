import { cn } from '@/lib/utils';
import { Reveal } from '@/components/ui/reveal';
import type { FeatureBlock } from '@/lib/features-types';
import { Phone } from './phone';
import { TINTS } from './tints';

type Banner = Extract<FeatureBlock, { type: 'banner' }>;

/** A headline over one big picture, edge to edge of the page column. The colour shows behind a picture that is not full-bleed. */
export function BannerBlock({ block }: { block: Banner }) {
  const tint = TINTS[block.tint];
  return (
    <Reveal className="px-3 py-3 sm:px-6">
      <section className="mx-auto max-w-6xl">
        {(block.title || block.intro) && (
          <div className="px-4 pb-6 sm:px-6">
            {block.title && <h2 className="max-w-3xl font-headline font-normal text-3xl leading-tight tracking-tight sm:text-4xl">{block.title}</h2>}
            {block.intro && <p className="mt-3 max-w-2xl text-lg leading-relaxed text-cuppi-ink-soft">{block.intro}</p>}
          </div>
        )}
        <div className={cn('relative aspect-[4/3] overflow-hidden rounded-[2rem] sm:aspect-[16/9]', tint.surface)}>
          <Phone image={block.image} sizes="(max-width: 1152px) 94vw, 1100px" />
        </div>
      </section>
    </Reveal>
  );
}
