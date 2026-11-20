'use client';

import { useEffect, useRef, useState } from 'react';
import { FadeImage } from '@/components/cuppi/fade-image';
import { PhoneMockup } from '@/components/cuppi/blocks/phone-mockup';
import { MOCKUPS } from '@/lib/phone-mockups';
import { Reveal } from '@/components/ui/reveal';
import { cn } from '@/lib/utils';
import { APP_IDS, APP_NAMES, COMPARE_LIMITS, dateLabel, type AppId, type CompareContent, type Shot } from '@/lib/compare-data';

/**
 * The older phone the rivals' screenshots sit in: the iPhone X frame in /public/phone-frames. The screenshot is laid flat behind
 * it, filling the frame's screen opening (measured from the image: 702 by 1483 at 49, 41 in its 799 by 1559), and the frame's
 * bezel and notch sit on top. Shown whole and unaltered, cropped only by the screen.
 */
const X = { src: '/phone-frames/iphone-X-front-mockup.webp', width: 799, height: 1559, left: 49, top: 41, screenW: 702, screenH: 1483, radius: 100 } as const;

const pct = (n: number, of: number) => `${((n / of) * 100).toFixed(3)}%`;

/** Every phone is drawn at the same height, whichever frame it is in; its width follows its frame. */
function XPhone({ shot, name }: { shot?: Shot; name: string }) {
  const screen: React.CSSProperties = {
    left: pct(X.left, X.width),
    top: pct(X.top, X.height),
    width: pct(X.screenW, X.width),
    height: pct(X.screenH, X.height),
    borderRadius: `${pct(X.radius, X.screenW)} / ${pct(X.radius, X.screenH)}`,
  };
  return (
    <div className="relative h-full" style={{ aspectRatio: `${X.width} / ${X.height}` }}>
      <div className="absolute overflow-hidden bg-cuppi-paper-deep" style={screen}>
        {shot ? (
          <FadeImage src={shot.src} alt={shot.alt} width={shot.width} height={shot.height} sizes="(max-width: 768px) 30vw, 200px" className="h-full w-full object-cover object-top" />
        ) : (
          <div className="grid h-full w-full place-items-center px-1 text-center text-[0.65rem] leading-tight text-cuppi-ink-soft">{name} screenshot to come</div>
        )}
      </div>
      <FadeImage soft src={X.src} alt="" width={X.width} height={X.height} sizes="200px" className="pointer-events-none absolute inset-0 h-full w-full select-none" />
    </div>
  );
}

/** A current phone, in the site's own render. With no screenshot yet, the same frame with an empty screen. */
function NewPhone({ shot }: { shot?: Shot }) {
  if (shot) return <PhoneMockup kind="front" src={shot.src} alt={shot.alt} imageWidth={shot.width} imageHeight={shot.height} bg="#FBF4E6" sizes="(max-width: 768px) 34vw, 260px" className="h-full" />;
  const m = MOCKUPS.front;
  const p = (n: number, of: number) => `${((n / of) * 100).toFixed(2)}%`;
  return (
    <div className="relative h-full" style={{ aspectRatio: `${m.width} / ${m.height}` }}>
      <div
        className="absolute grid place-items-center bg-cuppi-paper-deep px-1 text-center text-[0.65rem] leading-tight text-cuppi-ink-soft"
        style={{ left: p(m.screen.tl[0], m.width), top: p(m.screen.tl[1], m.height), right: p(m.width - m.screen.tr[0], m.width), bottom: p(m.height - m.screen.bl[1], m.height), borderRadius: '14%/6.5%' }}
      >
        Cuppi screenshot to come
      </div>
      <FadeImage soft src={m.src} alt="" width={m.width} height={m.height} sizes="260px" className="pointer-events-none absolute inset-0 h-full w-full select-none" />
    </div>
  );
}

/** How much the phones zoom in while their card is open, and how long the pointer must rest before they start to pan. */
const ZOOM = 1.5;
const PAN_AFTER_MS = 2000;
const PAN_EVERY_MS = 3600;

/**
 * How much of the row a card takes, and how tall it stands in it: an equal share at rest; the open one takes the lion's share and
 * stands tallest, and the others give way, narrower and shorter. The phones in the others shrink with them (by about the share of
 * width they lose) so they are not cut off at the sides.
 */
const GROW = { rest: 1, open: 2.2, other: 0.9 };
const HEIGHT = { rest: 0.92, open: 1, other: 0.84 };
const OTHER_SCALE = 0.66;
type CardState = 'rest' | 'open' | 'other';

const ORDER: AppId[] = ['cuppi', 'hartley', 'familywall'];

/** The older frame is this much wider than the current one at the same height (799/1559 against 1046/2162). */
const X_WIDER = 1.0593;

/** The stage's size and spacing, in rem: its height, the gap between cards, and the space inside a card around its phones and caption. */
const STAGE = { h: 27, gap: 1, padX: 1.25, padTop: 1.5, padBottom: 1.25, caption: 3, captionGap: 1, captionW: 14.5 };
/** The height of the window the phones show through in an open card: the card, less its top padding and the caption area below. */
const WINDOW_OPEN = STAGE.h - STAGE.padTop - (STAGE.padBottom + STAGE.caption + STAGE.captionGap);

/**
 * Where a card is, for a given open card (or none): its left edge, width, top and height as CSS lengths. They are calc()s of the
 * stage's own width (100cqw, as the stage is a size container) and its fixed height, so they need no measuring and work on the server.
 */
function place(index: number, active: AppId | null) {
  const grows = ORDER.map((a) => (active === null ? GROW.rest : a === active ? GROW.open : GROW.other));
  const sum = grows.reduce((a, b) => a + b, 0);
  const before = grows.slice(0, index).reduce((a, b) => a + b, 0) / sum;
  const state: CardState = active === null ? 'rest' : ORDER[index] === active ? 'open' : 'other';
  const hf = HEIGHT[state];
  const total = `(100cqw - ${2 * STAGE.gap}rem)`;
  return {
    state,
    '--x': `calc(${total} * ${before.toFixed(5)} + ${index * STAGE.gap}rem)`,
    '--w': `calc(${total} * ${(grows[index] / sum).toFixed(5)})`,
    '--y': `calc(${STAGE.h}rem * ${((1 - hf) / 2).toFixed(4)})`,
    '--h': `calc(${STAGE.h}rem * ${hf})`,
  };
}

/** The phones of one card in a row: all the same height; two empty frames until there are pictures, then as many as there are. */
function PhoneRow({ app, shots, slots }: { app: AppId; shots: Shot[]; slots: number }) {
  const Frame = app === 'cuppi' ? NewPhone : XPhone;
  return (
    <>
      {Array.from({ length: slots }, (_, i) => (
        <div key={i} className={cn('shrink-0', i % 2 === 1 && 'mt-6')} style={{ height: 'var(--ph)' }}>
          <Frame shot={shots[i]} name={APP_NAMES[app]} />
        </div>
      ))}
    </>
  );
}

const slotsOf = (shots: Shot[], count: number) => Math.min(Math.max(shots.length, 2), count);

/** One card in the stacked layout (a phone): at rest, no hover, the phones in a row above the caption. */
function StackedCard({ app, shots, count, className, caption }: { app: AppId; shots: Shot[]; count: number; className: string; caption: string }) {
  return (
    <figure className={cn('flex flex-col rounded-[2rem] px-3 pb-5 pt-6', className)}>
      <div className="flex items-start justify-center gap-2">
        <PhoneRow app={app} shots={shots} slots={slotsOf(shots, count)} />
      </div>
      <figcaption className="mt-4 text-center">
        <span className="font-headline text-xl font-normal">{APP_NAMES[app]}</span>
        <span className="block text-sm text-cuppi-ink-soft">{caption}</span>
      </figcaption>
    </figure>
  );
}

/**
 * One card on the stage (from a tablet up). Nothing here is laid out as it moves: the card's shape is a clip-path on a full-size layer,
 * and its phones and caption are moved and scaled by transform, so everything glides on the compositor at fractions of a pixel and no
 * edge is ever snapped to a whole pixel part-way (which is what makes edges shake as an animation slows to a stop). The hit areas
 * that decide which card the cursor is over are separate, invisible boxes (see CompareShots).
 */
function StageCard({
  app,
  index,
  active,
  shots,
  count,
  panned,
  tone,
  caption,
}: {
  app: AppId;
  index: number;
  active: AppId | null;
  shots: Shot[];
  count: number;
  panned: boolean;
  tone: { bg: string; fade: string; border: boolean };
  caption: string;
}) {
  const { state, ...vars } = place(index, active);
  const slots = slotsOf(shots, count);
  const frameW = app === 'cuppi' ? 'var(--pw)' : `calc(var(--pw) * ${X_WIDER})`;
  const scale = state === 'open' ? ZOOM : state === 'other' ? OTHER_SCALE : 1;
  return (
    <figure
      className="cmp-card pointer-events-none absolute inset-0"
      style={{ ...(vars as React.CSSProperties), ['--rowW' as string]: `calc(${slots} * ${frameW} + ${slots - 1} * 0.5rem)`, ['--s' as string]: scale, ['--cs' as string]: state === 'other' ? 0.86 : 1 }}
    >
      {tone.border && <div aria-hidden className="cmp-layer cmp-border bg-cuppi-line" />}
      <div aria-hidden className={cn('cmp-layer', tone.border ? 'cmp-fill' : 'cmp-shape', tone.bg)} />
      {/* The window the phones show through: a clip of its own, so zoomed phones are cropped above the caption. */}
      <div aria-hidden className="cmp-layer cmp-window">
        <div className="cmp-phones absolute left-0 top-0 flex items-start gap-2">
          <div className="flex items-start gap-2" style={{ transform: `translate3d(0, ${panned && state === 'open' ? 'calc(-1 * var(--reach))' : '0px'}, 0)`, transition: 'transform 2.6s ease-in-out' }}>
            <PhoneRow app={app} shots={shots} slots={slots} />
          </div>
        </div>
      </div>
      {/* Only while the card is open, when the zoomed phones run past the window's bottom, does that edge fade; at rest the phones end clear of it. */}
      <div aria-hidden className="cmp-layer cmp-fade-clip">
        <div className={cn('cmp-fade bg-gradient-to-b from-transparent', tone.fade)} style={{ opacity: state === 'open' ? 1 : 0 }} />
      </div>
      <figcaption className="cmp-caption absolute left-0 top-0 flex flex-col justify-end text-center">
        <span className="font-headline text-xl font-normal">{APP_NAMES[app]}</span>
        <span className="block text-sm text-cuppi-ink-soft">{caption}</span>
      </figcaption>
    </figure>
  );
}

/**
 * Up to three screenshots of each app, so a visitor gets the feel of Cuppi next to the others. Every phone is the same size (set by how
 * many a card holds at most). With a mouse, resting on a card opens it: it takes most of the row and the others give way, its phones
 * zoom in, and after two seconds they pan up and down so the rest of the screen is seen. Touch screens and people who ask for less
 * motion just see the cards at rest; on a phone the cards stack.
 */
export function CompareShots({ content }: { content: CompareContent }) {
  const when = dateLabel(content.checkedOn);
  const [active, setActive] = useState<AppId | null>(null);
  const [panned, setPanned] = useState(false);
  const calm = useRef(false);

  useEffect(() => {
    calm.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches || !window.matchMedia('(hover: hover)').matches;
  }, []);

  // After the pointer has rested on a card for a couple of seconds, start the pan, and keep going back and forth until it leaves.
  useEffect(() => {
    setPanned(false);
    if (!active) return;
    let down = false;
    let every: ReturnType<typeof setInterval> | undefined;
    const start = setTimeout(() => {
      down = true;
      setPanned(true);
      every = setInterval(() => {
        down = !down;
        setPanned(down);
      }, PAN_EVERY_MS);
    }, PAN_AFTER_MS);
    return () => {
      clearTimeout(start);
      if (every) clearInterval(every);
    };
  }, [active]);

  const count = Math.min(Math.max(2, ...APP_IDS.map((a) => content.shots[a].length)), COMPARE_LIMITS.shots);
  const cards: { app: AppId; className: string; tone: { bg: string; fade: string; border: boolean }; caption: string }[] = [
    { app: 'cuppi', className: 'bg-cuppi-honey-soft', tone: { bg: 'bg-cuppi-honey-soft', fade: 'to-cuppi-honey-soft', border: false }, caption: 'Cuppi Home on iPhone' },
    { app: 'hartley', className: 'border border-cuppi-line bg-cuppi-card', tone: { bg: 'bg-cuppi-card', fade: 'to-cuppi-card', border: true }, caption: `Hartley, captured ${when}` },
    { app: 'familywall', className: 'border border-cuppi-line bg-cuppi-card', tone: { bg: 'bg-cuppi-card', fade: 'to-cuppi-card', border: true }, caption: `FamilyWall, captured ${when}` },
  ];

  return (
    <Reveal>
      {/*
        The row is a size container, so every phone's size comes from the row's width and not from its card's (a card that opens
        would otherwise make its phones grow with it): a card's share at rest is a third of the row, less the gaps and padding, split
        by how many phones a card holds, with a little to spare for the older frame, which is a touch wider at the same height.
      */}
      <div
        className="[container-type:inline-size] [--cw:calc(100cqw-2.5rem)] md:[--cw:calc((100cqw-2rem)/3-2.5rem)]"
        style={{
          ['--n' as string]: count,
          ['--pw' as string]: 'calc((var(--cw) - (var(--n) - 1) * 0.5rem) / (var(--n) * 1.06))',
          ['--ph' as string]: 'calc(var(--pw) / 0.4838)',
          // How far the zoomed phones overhang the bottom of an open card's window, in the phones' own units: how far to pan.
          ['--reach' as string]: `calc(max(0px, (var(--ph) + 1.5rem) * ${ZOOM} - ${WINDOW_OPEN}rem) / ${ZOOM})`,
        }}
      >
        <div className="flex flex-col gap-4 md:hidden">
          {cards.map((c) => (
            <StackedCard key={c.app} app={c.app} shots={content.shots[c.app]} count={count} className={c.className} caption={c.caption} />
          ))}
        </div>

        <div className="relative hidden md:block" style={{ height: `${STAGE.h}rem` }}>
          {cards.map((c, i) => (
            <StageCard key={c.app} app={c.app} index={i} active={active} shots={content.shots[c.app]} count={count} panned={panned} tone={c.tone} caption={c.caption} />
          ))}
          {/* Invisible boxes that follow the cards and tell which one the cursor is on. Their own jitter, if any, can't be seen. */}
          <div className="absolute inset-0 flex">
            {ORDER.map((app, i) => (
              <div
                key={app}
                className="min-w-0 basis-0"
                style={{ flexGrow: active === null ? GROW.rest : active === app ? GROW.open : GROW.other, marginLeft: i === 0 ? 0 : `${STAGE.gap}rem`, transition: 'flex-grow 600ms cubic-bezier(0.4, 0, 0.2, 1)' }}
                onPointerEnter={(e) => e.pointerType === 'mouse' && !calm.current && setActive(app)}
                onPointerLeave={(e) => e.pointerType === 'mouse' && setActive(null)}
              />
            ))}
          </div>
        </div>
      </div>
    </Reveal>
  );
}
