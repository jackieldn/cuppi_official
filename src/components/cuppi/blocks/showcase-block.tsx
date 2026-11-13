import { cn } from '@/lib/utils';
import { Reveal } from '@/components/ui/reveal';
import type { FeatureBlock } from '@/lib/features-types';
import { Phone } from './phone';
import { TINTS } from './tints';

type Showcase = Extract<FeatureBlock, { type: 'showcase' }>;

/** Text on the page, a phone rising out of a colour card beside it. `side` says where the text goes. */
export function ShowcaseBlock({ block }: { block: Showcase }) {
  const tint = TINTS[block.tint];
  const textRight = block.side === 'right';
  return (
    <Reveal className="cuppi-on-reveal px-3 sm:px-6">
      <section className="mx-auto grid max-w-6xl items-stretch gap-4 py-3 md:grid-cols-2 md:gap-6">
        <div
          className={cn(
            'flex flex-col justify-center gap-4 px-4 py-8 sm:px-10 md:py-14',
            textRight && 'md:order-2',
          )}
        >
          {block.eyebrow && (
            <span className={cn('w-fit rounded-full px-3.5 py-0.5 font-headline text-base', tint.chip)}>
              {block.eyebrow}
            </span>
          )}
          <h2 className="font-headline font-normal text-3xl leading-tight tracking-tight sm:text-4xl">
            {block.title}
          </h2>
          <p className="max-w-lg whitespace-pre-line text-lg leading-relaxed text-cuppi-ink-soft">{block.body}</p>
        </div>
        <div className={cn('relative min-h-[22rem] overflow-hidden rounded-[2rem] md:min-h-[30rem]', tint.surface, textRight && 'md:order-1')}>
          <div className="cuppi-rise-scroll absolute inset-0">
            <Phone image={block.image} sizes="(max-width: 768px) 92vw, 46vw" sink={3} />
          </div>
        </div>
      </section>
    </Reveal>
  );
}
