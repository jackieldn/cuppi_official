import { cn } from '@/lib/utils';
import { Reveal } from '@/components/ui/reveal';
import type { FeatureBlock } from '@/lib/features-types';
import { TINTS } from './tints';
import { VideoPlayer } from './video-player';

type Video = Extract<FeatureBlock, { type: 'video' }>;

/**
 * A tutorial or an ad. Widescreen (16:9) fills its space like a picture. Phone-shaped (9:16) would
 * be a sliver in the same space, so it stands in a colour card at a sensible height instead.
 * `layout: 'full'` puts the words above the video; `'split'` puts them beside it.
 */
export function VideoBlock({ block }: { block: Video }) {
  const tint = TINTS[block.tint];
  const tall = block.video.aspect === '9:16';
  const split = block.layout === 'split';
  const textRight = block.side === 'right';
  const hasWords = !!(block.eyebrow || block.title || block.body);

  const words = hasWords && (
    <div className={cn(split ? 'flex flex-col justify-center gap-4 px-4 py-8 sm:px-10 md:py-14' : 'px-4 pb-6 sm:px-6', split && textRight && 'md:order-2')}>
      {block.eyebrow && <span className={cn('w-fit rounded-full px-3.5 py-0.5 font-headline text-base', tint.chip)}>{block.eyebrow}</span>}
      {block.title && <h2 className={cn('max-w-2xl font-headline font-normal text-3xl leading-tight tracking-tight sm:text-4xl', block.eyebrow && !split && 'mt-4')}>{block.title}</h2>}
      {block.body && <p className={cn('whitespace-pre-line text-lg leading-relaxed text-cuppi-ink-soft', split ? 'max-w-lg' : 'mt-3 max-w-2xl')}>{block.body}</p>}
    </div>
  );

  // Widescreen: the player is the card. Phone-shaped: a colour card with the player standing in it.
  const player = tall ? (
    <div className={cn('flex items-center justify-center overflow-hidden rounded-[2rem] px-6 py-8 sm:py-10', tint.surface, split && textRight && 'md:order-1')}>
      <div className="relative w-full max-w-[17rem] overflow-hidden rounded-[1.75rem] bg-cuppi-espresso sm:max-w-[19rem]" style={{ aspectRatio: '9 / 16', maxHeight: '75vh' }}>
        <VideoPlayer video={block.video} />
      </div>
    </div>
  ) : (
    <div className={cn('flex items-center', split && textRight && 'md:order-1')}>
      <div className="relative w-full overflow-hidden rounded-[2rem] bg-cuppi-espresso" style={{ aspectRatio: '16 / 9' }}>
        <VideoPlayer video={block.video} />
      </div>
    </div>
  );

  return (
    <Reveal className="px-3 py-3 sm:px-6">
      <section className={cn('mx-auto max-w-6xl', split ? 'grid items-stretch gap-4 md:grid-cols-2 md:gap-6' : '')}>
        {words}
        {player}
      </section>
    </Reveal>
  );
}
