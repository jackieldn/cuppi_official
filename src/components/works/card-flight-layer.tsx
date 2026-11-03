'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { clearFlight, getFlightTarget, useFlight } from '@/lib/card-flight';

const PUSH_BACK_SCALE = 0.94;
const FLY_MS = 1500;

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const easeOutQuint = (t: number) => 1 - Math.pow(1 - t, 5);

// A shadow as a list of layers (y offset, blur, spread, alpha), so two shadows can be
// blended number by number. The cards use Tailwind's shadow-lg at rest and shadow-2xl
// while hovered; the project cover has none. Matching these at the ends of a flight is
// what lets the copy hand over without a visible change.
type Shadow = { y: number; blur: number; spread: number; a: number }[];
const NO_SHADOW: Shadow = [
  { y: 0, blur: 0, spread: 0, a: 0 },
  { y: 0, blur: 0, spread: 0, a: 0 },
];
const CARD_SHADOW: Shadow = [
  { y: 10, blur: 15, spread: -3, a: 0.1 },
  { y: 4, blur: 6, spread: -4, a: 0.1 },
];
const HOVER_SHADOW: Shadow = [
  { y: 25, blur: 50, spread: -12, a: 0.25 },
  { y: 0, blur: 0, spread: 0, a: 0 },
];

// Forward starts from the hovered card (you just clicked it) and sits down on the
// cover; back lifts off the cover and settles on the card at rest.
const shadowEnds = (direction: 'forward' | 'back'): [Shadow, Shadow] =>
  direction === 'forward' ? [HOVER_SHADOW, NO_SHADOW] : [NO_SHADOW, CARD_SHADOW];

function shadowCss(from: Shadow, to: Shadow, t: number, lift = 0): string {
  return from
    .map((f, i) => {
      const x = to[i];
      // `lift` swells the main layer mid-flight, so the copy looks like it's above the page.
      const extra = i === 0 ? lift : 0;
      const y = lerp(f.y, x.y, t) + 18 * extra;
      const blur = lerp(f.blur, x.blur, t) + 36 * extra;
      const spread = lerp(f.spread, x.spread, t);
      const a = lerp(f.a, x.a, t) + 0.15 * extra;
      return `0 ${y.toFixed(2)}px ${blur.toFixed(2)}px ${spread.toFixed(2)}px rgb(0 0 0 / ${a.toFixed(3)})`;
    })
    .join(', ');
}

/**
 * Draws the copy of the clicked works card above the whole page and, once the project
 * page says where its cover is, glides it there. Lives in the layout so it survives
 * the route change. See src/lib/card-flight.ts.
 */
export function CardFlightLayer() {
  const flight = useFlight();
  const pathname = usePathname();
  const ref = useRef<HTMLDivElement>(null);

  // Wandered off to some other page: nothing to land on.
  useEffect(() => {
    if (flight && !pathname.startsWith('/works')) clearFlight();
  }, [flight, pathname]);

  // The click: the card presses back a little and waits for the next page.
  useEffect(() => {
    const el = ref.current;
    if (!flight || !el) return;
    el.style.transition = 'none';
    el.style.transform = 'scale(1)';
    el.getBoundingClientRect(); // commit the starting state so the next change animates
    el.style.transition = 'transform 220ms cubic-bezier(0.33, 1, 0.68, 1)';
    el.style.transform = `scale(${PUSH_BACK_SCALE})`;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flight?.id]);

  // The destination is ready: glide onto it. The target is re-measured every frame,
  // so scrolling or a layout shift while it flies doesn't make it miss.
  useEffect(() => {
    const el = ref.current;
    if (!flight || flight.phase !== 'flying' || !el) return;

    const img = el.firstElementChild as HTMLElement | null;
    const from = el.getBoundingClientRect(); // includes the push-back scale
    el.style.transition = 'none';
    el.style.transform = 'none';
    el.style.left = `${from.left}px`;
    el.style.top = `${from.top}px`;
    el.style.width = `${from.width}px`;
    el.style.height = `${from.height}px`;

    let frame = 0;
    let startedAt: number | null = null;
    let lastNow = 0;
    // The target is low-pass filtered. If it moves while we're flying (the grid
    // re-ordering as data arrives, say) the copy glides to its new spot instead of
    // snapping to it.
    let smooth: DOMRect | null = null;
    const tick = (now: number) => {
      if (startedAt === null) startedAt = now;
      const dt = lastNow ? now - lastNow : 16;
      lastNow = now;
      const target = getFlightTarget();
      if (!target) {
        clearFlight();
        return;
      }
      const to = target.getBoundingClientRect();
      const follow = 1 - Math.exp(-dt / 70);
      smooth = smooth
        ? new DOMRect(
            lerp(smooth.left, to.left, follow),
            lerp(smooth.top, to.top, follow),
            lerp(smooth.width, to.width, follow),
            lerp(smooth.height, to.height, follow)
          )
        : to;
      const elapsed = now - startedAt;
      const progress = Math.min(1, elapsed / FLY_MS);
      const t = easeOutQuint(progress);
      const toRadius = parseFloat(getComputedStyle(target.querySelector('img') ?? target).borderTopLeftRadius) || flight.radius;
      el.style.left = `${lerp(from.left, smooth.left, t)}px`;
      el.style.top = `${lerp(from.top, smooth.top, t)}px`;
      el.style.width = `${lerp(from.width, smooth.width, t)}px`;
      el.style.height = `${lerp(from.height, smooth.height, t)}px`;
      el.style.borderRadius = `${lerp(flight.radius, toRadius, t)}px`;
      // Settle the shadow to the destination's (none, on the cover) and the picture's
      // zoom to match, so nothing changes at the moment of hand-over.
      const [shadowFrom, shadowTo] = shadowEnds(flight.direction);
      // The shadow has its own, gentler curve: the position eases out fast, but the
      // shadow should keep settling right up to the moment of touch-down.
      const shadowT = 1 - Math.pow(1 - progress, 2);
      el.style.boxShadow = shadowCss(shadowFrom, shadowTo, shadowT, Math.sin(Math.PI * progress));
      if (img) img.style.transform = `scale(${lerp(flight.imgScaleFrom, flight.imgScaleTo, t)})`;
      // Done once the animation has run its course AND we've caught up with the
      // target (with a cap, so a target that keeps moving can't hold us forever).
      const caughtUp =
        Math.abs(smooth.left - to.left) < 0.5 &&
        Math.abs(smooth.top - to.top) < 0.5 &&
        Math.abs(smooth.width - to.width) < 0.5;
      if (progress < 1 || (!caughtUp && elapsed < FLY_MS + 1500)) {
        frame = requestAnimationFrame(tick);
      } else {
        clearFlight();
      }
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flight?.id, flight?.phase]);

  if (!flight) return null;

  const [shadowStart] = shadowEnds(flight.direction);

  return (
    <div
      key={flight.id}
      ref={ref}
      aria-hidden="true"
      className="pointer-events-none fixed z-[60] overflow-hidden"
      style={{
        left: flight.rect.left,
        top: flight.rect.top,
        width: flight.rect.width,
        height: flight.rect.height,
        borderRadius: flight.radius,
        boxShadow: shadowCss(shadowStart, shadowStart, 0),
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={flight.src}
        alt=""
        draggable={false}
        className="h-full w-full object-cover"
        style={{ transform: `scale(${flight.imgScaleFrom})` }}
      />
    </div>
  );
}
