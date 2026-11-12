'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Reveal } from '@/components/ui/reveal';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious, type CarouselApi } from '@/components/ui/carousel';
import type { FeatureBlock } from '@/lib/features-types';
import { Phone } from './phone';
import { TINTS, TINT_CYCLE } from './tints';

type Cards = Extract<FeatureBlock, { type: 'cards' }>;

const arrow =
  'static h-11 w-11 translate-y-0 rounded-full border-cuppi-line bg-cuppi-card text-cuppi-ink transition-transform duration-300 [transition-timing-function:var(--ease-spring)] hover:scale-110 hover:bg-cuppi-card disabled:opacity-35';

/** A swipeable row of phone cards. Drag, swipe, or use the arrows. */
export function CardsBlock({ block }: { block: Cards }) {
  const [api, setApi] = useState<CarouselApi>();
  return (
    <Reveal className="px-3 py-6 sm:px-6">
      <Carousel opts={{ align: 'start' }} setApi={setApi} className="mx-auto w-full max-w-6xl">
        <div className="flex items-end justify-between gap-6 px-4 pb-6 sm:px-6">
          <div className="max-w-2xl">
            <h2 className="font-headline text-3xl font-semibold leading-tight tracking-tight [font-variation-settings:'SOFT'_100] sm:text-4xl">
              {block.title}
            </h2>
            {block.intro && <p className="mt-3 text-lg text-cuppi-ink-soft">{block.intro}</p>}
          </div>
          {block.cards.length > 1 && (
            <div className={cn('hidden shrink-0 gap-2 transition-opacity sm:flex', !api && 'opacity-0')}>
              <CarouselPrevious className={arrow} />
              <CarouselNext className={arrow} />
            </div>
          )}
        </div>
        <div>
          <CarouselContent className="-ml-4">
            {block.cards.map((card, i) => {
              const tint = TINTS[TINT_CYCLE[i % TINT_CYCLE.length]];
              return (
                <CarouselItem key={card.title} className="basis-[86%] pl-4 sm:basis-[58%] lg:basis-[40%]">
                  <article className={cn('relative flex h-full min-h-[34rem] flex-col overflow-hidden rounded-[2rem]', tint.surface)}>
                    <div className="px-6 pb-2 pt-7">
                      <h3 className="font-headline text-2xl font-semibold leading-snug [font-variation-settings:'SOFT'_100]">{card.title}</h3>
                      <p className="mt-2 whitespace-pre-line text-[0.95rem] leading-relaxed text-cuppi-ink-soft">{card.body}</p>
                    </div>
                    <div className="relative mt-auto min-h-[24rem] flex-1">
                      <Phone image={card.image} sizes="(max-width: 768px) 80vw, 36vw" sink={3} />
                    </div>
                  </article>
                </CarouselItem>
              );
            })}
          </CarouselContent>
        </div>
        {block.footnotes && block.footnotes.length > 0 && (
          <div className="space-y-1 px-6 pt-5 text-xs text-cuppi-ink-soft">
            {block.footnotes.map((note) => (
              <p key={note}>{note}</p>
            ))}
          </div>
        )}
      </Carousel>
    </Reveal>
  );
}
