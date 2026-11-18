import { cn } from '@/lib/utils';
import type { FeatureImage, FeatureShot } from '@/lib/features-types';
import { MOCKUPS, contentEndFrac, screenSpan } from '@/lib/phone-mockups';
import { PhoneMockup } from './phone-mockup';

// What a screenshot is assumed to measure until its real size is known (a current iPhone screenshot).
const GUESS = { width: 1170, height: 2532 };

/**
 * Where the phones hang, as percentages of their box's height, for each place they are used:
 *   card          a feature page's cards: one phone 165% tall hanging from 7%
 *   hero-split    the home hero beside its words (either side): one phone 162% tall from 7%
 *   hero-centred  the home hero with its words above: one phone 190% tall from 4%
 * A pair is smaller than one phone so both fit the box's width: its phones are `--h` tall (a % of the box's height), which
 * changes with the screen (the classes set `--h0`, and `--h` is that unless the pair would be wider than `maxWidth`), hanging from `pairTop`. `maxWidth` (a share of the box's width, 0 for none) stops a single
 * phone being wider than its box: a narrow box, such as a card in a phone's swipeable row, makes it shorter instead of cutting off its sides. `shadow` is the soft drop shadow under a phone, from md up:
 * a blurred shadow follows the phone's whole outline, which a small phone's graphics memory pays for.
 */
const GEOMETRY = {
  card: { top: 7, height: 165, pairTop: 8, pairClasses: '[--h0:100] md:[--h0:112]', shadow: true, maxWidth: 0.88 },
  // 20% bigger than it was (135, 76 and 84), with the same window and the same top, so the block does not get taller.
  'hero-split': { top: 7, height: 162, pairTop: 7, pairClasses: '[--h0:91.2] md:[--h0:100.8]', shadow: false, maxWidth: 0 },
  'hero-centred': { top: 4, height: 190, pairTop: 5, pairClasses: '[--h0:100] sm:[--h0:115] md:[--h0:140]', shadow: false, maxWidth: 0 },
} as const;
export type FramedVariant = keyof typeof GEOMETRY;

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
export function FramedPhones({ image, sizes, priority, className, variant = 'card' }: { image: FeatureImage; sizes: string; priority?: boolean; className?: string; variant?: FramedVariant }) {
  const g = GEOMETRY[variant];
  const kind = image.frame ?? 'front';
  // Only the straight-on phone is held to its box's width: the turned render has empty space round the phone, and fits as it is.
  const capped = g.maxWidth > 0 && kind === 'front';
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
      className={cn('h-full shrink-0', g.shadow && 'md:drop-shadow-[0_24px_30px_rgb(var(--c-shadow)/0.18)]', extra)}
      style={style}
    />
  );

  if (!image.second?.url) {
    const { width, height } = sizeOf(image);
    const bottomView = image.view === 'bottom';
    // The phone's height: `g.height` % of the box's height (`cqh`, the box being a size container), unless that would make it wider than
    // `maxWidth` of the box's width (`cqw`). It is a variable because the height, the bottom view's top and the hover strip all use it.
    const mock = MOCKUPS[kind];
    const ph = capped ? `min(${g.height}cqh, ${(g.maxWidth * 100 * mock.height / mock.width).toFixed(2)}cqw)` : `${g.height}cqh`;
    // How far a bottom view sits above a top view (never below it). It rises until the phone's bottom edge sits as far above the box's
    // bottom as its top edge sits below the top (see bottomViewTop), so it follows the phone's height.
    const reach = (1 - screenSpan(kind).bottom + contentEndFrac(kind, width, height)).toFixed(4);
    const rise = `min(0px, calc(100cqh - ${2 * g.top}cqh - var(--ph) * ${reach}))`;
    const top = bottomView ? `calc(${g.top}cqh + var(--rise))` : `${g.top}cqh`;
    // With the tick on, the cursor slides it to the other end of the screenshot.
    const slide = image.slide ? (bottomView ? 'calc(-1 * var(--rise))' : 'var(--rise)') : undefined;
    return (
      // `phone-slide-host` / `phone-slide` (globals.css): the phone eases to the other end while the cursor is over the phone.
      // The hover target is `phone-hit`, not the whole box: a transparent strip as wide as the phone and as tall as the box, laid over
      // it. It stays put while the phone moves under it (so the phone cannot slide out from under the cursor and flicker), and the
      // empty space beside the phone does nothing. The host is a size container so the strip's width can follow the phone's height.
      <div className={cn('absolute inset-0 [container-type:size]', slide && 'phone-slide-host pointer-events-none', className)}>
        <div className={cn('absolute left-1/2', slide ? 'phone-slide' : '-translate-x-1/2')} style={{ top, height: 'var(--ph)', ['--ph' as string]: ph, ['--rise' as string]: rise, ...(slide ? ({ '--slide': slide } as React.CSSProperties) : {}) }}>
          {phone(image, flip)}
        </div>
        {slide && (
          <div
            aria-hidden
            className="phone-hit pointer-events-auto absolute inset-y-0 left-1/2 z-10 -translate-x-1/2"
            style={{ width: `calc(var(--ph) * ${mock.width / mock.height})`, maxWidth: '100%' }}
          />
        )}
      </div>
    );
  }

  const arrange = image.arrange ?? 'lower';
  // Each phone's top edge, in the card's % of height, is a CSS number so it can follow --h: a top view hangs from `pairTop`; a bottom
  // view is raised until its bottom edge sits `pairTop` above the card's bottom. The "lower" phone sits STAGGER lower in a top view and flush in
  // a bottom view; the other one is level in a top view and raised by STAGGER in a bottom view, so the difference between them is kept.
  const place = (shot: FeatureShot, lower: boolean): React.CSSProperties => {
    // The phone's bottom edge sits `pairTop` above the card's bottom (the gap above it in a top view, repeated), so the phone is whole.
    const reach = (1 - screenSpan(kind).bottom + contentEndFrac(kind, sizeOf(shot).width, sizeOf(shot).height)).toFixed(4);
    const top = g.pairTop + (lower ? STAGGER : 0);
    const y = shot.view === 'bottom' ? `min(${g.pairTop}, calc(100 - ${g.pairTop} - var(--h) * ${reach} - ${lower ? 0 : arrange === 'level' ? 0 : STAGGER}))` : `${top}`;
    return { transform: 'translateY(calc(var(--y) / var(--h) * 100%))', ['--y' as string]: y };
  };
  const lowerFirst = arrange === 'higher';
  const lowerSecond = arrange === 'lower';
  // The pair is two phones side by side (overlapping a little, or with a gap when level), so its width is about two phones' widths. When that
  // would be wider than `maxWidth` of the box, `--h` is the smaller height that fits: a number, as a share of the box's height, worked out
  // as (a width in `cqw`) / (the box's height) with the same atan2 trick the scaling uses.
  const aspect = MOCKUPS[kind].width / MOCKUPS[kind].height;
  const fitCqw = (((arrange === 'level' ? g.maxWidth - 0.025 : g.maxWidth + 0.03) * 100) / (2 * aspect)).toFixed(2);
  const hStyle = capped ? ({ '--h': `min(var(--h0), calc(100 * tan(atan2(${fitCqw}cqw, 100cqh))))` } as React.CSSProperties) : ({ '--h': 'var(--h0)' } as React.CSSProperties);
  return (
    <div className={cn('absolute inset-0 [container-type:size]', className)}>
      {/* Smaller than one phone, so the pair fits the same space. Staggered, the two overlap a little; level, they stand at the same height with a small gap. */}
      <div className={cn('absolute inset-x-0 top-0 flex h-[calc(var(--h)*1%)] items-start justify-center', g.pairClasses, arrange === 'level' && 'gap-[2.5%]')} style={hStyle}>
        {phone(image, flip, arrange !== 'level' ? '-mr-[3%]' : undefined, place(image, lowerFirst))}
        {phone(image.second, !flip, undefined, place(image.second, lowerSecond))}
      </div>
    </div>
  );
}
