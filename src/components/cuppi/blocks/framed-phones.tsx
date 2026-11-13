import { cn } from '@/lib/utils';
import type { FeatureImage, FeatureShot } from '@/lib/features-types';
import { contentEndFrac, phoneTops, screenSpan } from '@/lib/phone-mockups';
import { PhoneMockup } from './phone-mockup';

// What a screenshot is assumed to measure until its real size is known (a current iPhone screenshot).
const GUESS = { width: 1170, height: 2532 };

// Where the phones hang, as percentages of the card's height.
const SINGLE = { top: 7, height: 165 };
/** A pair is smaller than one phone so that both fit the card's width: its height is --h, 100 on a phone and 112 from md up. */
const PAIR_TOP = 8;
/** How far the lower phone of a pair sits below the other. */
const STAGGER = 14;

const sizeOf = (shot: FeatureShot) => ({ width: shot.width ?? GUESS.width, height: shot.height ?? GUESS.height });

/**
 * A plain app screenshot inside an iPhone render, as in the home hero: the phone is taller than its
 * space and hangs from near the top, so the top of the app shows and the card crops the rest. Each
 * phone can instead show the BOTTOM of its screenshot (`view`): it is moved up until its bottom edge
 * sits the same gap above the card's bottom as its top edge sat below the card's top. With a second screenshot there are two phones side by
 * side (the right one lower, higher, or level with a small gap), each with its own view; turned
 * phones face each other. Fills a `relative overflow-hidden` parent, like Phone.
 */
export function FramedPhones({ image, sizes, priority, className }: { image: FeatureImage; sizes: string; priority?: boolean; className?: string }) {
  const kind = image.frame ?? 'front';
  const bg = image.bg ?? '#FFFFFF';
  const flip = !!image.flip;

  const phone = (shot: FeatureShot, mirrored: boolean, extra?: string, style?: React.CSSProperties) => (
    <PhoneMockup
      kind={kind}
      flip={mirrored}
      src={shot.url}
      alt={shot.alt}
      imageWidth={sizeOf(shot).width}
      imageHeight={sizeOf(shot).height}
      bg={bg}
      sizes={sizes}
      priority={priority}
      className={cn('h-full shrink-0 drop-shadow-[0_24px_30px_rgb(var(--c-shadow)/0.18)]', extra)}
      style={style}
    />
  );

  if (!image.second?.url) {
    const { width, height } = sizeOf(image);
    const tops = phoneTops(kind, width, height, SINGLE.top, SINGLE.height);
    const bottomView = image.view === 'bottom';
    const rest = bottomView ? tops.bottom : tops.top;
    // With the tick on, the cursor slides it to the other end of the screenshot.
    const slide = image.slide ? `${Math.round(((bottomView ? tops.top : tops.bottom) - rest) / SINGLE.height * 1000) / 10}%` : undefined;
    return (
      // `phone-slide-host` / `phone-slide` (globals.css): the phone eases to the other end while the cursor is over the card.
      <div className={cn('absolute inset-0', slide && 'phone-slide-host', className)}>
        <div className={cn('absolute left-1/2 h-[165%]', slide ? 'phone-slide' : '-translate-x-1/2')} style={{ top: `${rest}%`, ...(slide ? ({ '--slide': slide } as React.CSSProperties) : {}) }}>
          {phone(image, flip)}
        </div>
      </div>
    );
  }

  const arrange = image.arrange ?? 'lower';
  // Each phone's top edge, in the card's % of height, is a CSS number so it can follow --h: a top view hangs from PAIR_TOP; a bottom
  // view is raised until its bottom edge sits PAIR_TOP above the card's bottom. The "lower" phone sits STAGGER lower in a top view and flush in
  // a bottom view; the other one is level in a top view and raised by STAGGER in a bottom view, so the difference between them is kept.
  const place = (shot: FeatureShot, lower: boolean): React.CSSProperties => {
    // The phone's bottom edge sits PAIR_TOP above the card's bottom (the gap above it in a top view, repeated), so the phone is whole.
    const reach = (1 - screenSpan(kind).bottom + contentEndFrac(kind, sizeOf(shot).width, sizeOf(shot).height)).toFixed(4);
    const top = PAIR_TOP + (lower ? STAGGER : 0);
    const y = shot.view === 'bottom' ? `min(${PAIR_TOP}, calc(100 - ${PAIR_TOP} - var(--h) * ${reach} - ${lower ? 0 : arrange === 'level' ? 0 : STAGGER}))` : `${top}`;
    return { transform: 'translateY(calc(var(--y) / var(--h) * 100%))', ['--y' as string]: y };
  };
  const lowerFirst = arrange === 'higher';
  const lowerSecond = arrange === 'lower';
  return (
    <div className={cn('absolute inset-0', className)}>
      {/* Smaller than one phone, so the pair fits the same space. Staggered, the two overlap a little; level, they stand at the same height with a small gap. */}
      <div className={cn('absolute inset-x-0 top-0 flex h-[calc(var(--h)*1%)] items-start justify-center [--h:100] md:[--h:112]', arrange === 'level' && 'gap-[2.5%]')}>
        {phone(image, flip, arrange !== 'level' ? '-mr-[3%]' : undefined, place(image, lowerFirst))}
        {phone(image.second, !flip, undefined, place(image.second, lowerSecond))}
      </div>
    </div>
  );
}
