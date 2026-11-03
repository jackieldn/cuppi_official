'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Ambient glow under the project cover, the same trick as the home-page video: a
 * blurred copy of the picture itself behind it, so the light that spills out is the
 * picture's own colours, continuous with its bottom edge.
 *
 * The copy is mirrored (flipped vertically and bottom-aligned) so the row just below
 * the cover is the picture's bottom row. Brighter copies then sweep along it, one at a
 * time or a few overlapping, each launched at a random moment with a random direction
 * (left to right or right to left), speed, width and strength.
 *
 * A CSS mask clips whatever it is applied to at that element's box, blur spill
 * included. So the masks sit on wrapper boxes much bigger than the blurred pictures
 * inside them (MARGIN_X / MARGIN_TOP), and never on a blurred element itself.
 *
 * Place inside the cover's `relative` box, BEFORE the picture, so it paints behind it.
 */
const GLOW_H = '3.5rem'; // how far the pictures reach below the cover's bottom edge
const MARGIN_X = '5rem'; // wrapper extends this far past the cover's sides
const MARGIN_TOP = '1.25rem';

const flipped = { objectPosition: 'bottom', transform: 'scaleY(-1)' } as const;
const picture = {
  position: 'absolute',
  left: MARGIN_X,
  right: MARGIN_X,
  top: MARGIN_TOP,
  height: GLOW_H,
  width: `calc(100% - 2 * ${MARGIN_X})`,
  ...flipped,
} as const;

interface Sweep {
  id: number;
  dir: 'ltr' | 'rtl';
  ms: number;
  /** Width of the moving window, as a fraction of the glow's width. */
  width: number;
  strength: number;
}

const rand = (min: number, max: number) => min + Math.random() * (max - min);
const MAX_SWEEPS = 3;

const fadeAcross = `linear-gradient(90deg, transparent ${MARGIN_X}, black 50%, transparent calc(100% - ${MARGIN_X}))`;
const fadeDown = `linear-gradient(to bottom, black calc(${MARGIN_TOP} + 0.2rem), transparent calc(${MARGIN_TOP} + 3rem))`;

/**
 * One brighter pass. Each effect has its own wrapper so the masks (which multiply) and
 * the blur never share an element: the 0-100-0 fade across the cover, then the downward
 * fade, then the moving window. The window is animated with the Web Animations API from
 * fully off one end to fully off the other; for a window of width w (as a fraction), a
 * mask-position of -w/(1-w) * 100% is just off the left end.
 */
function GlowSweep({ src, sweep, onDone }: { src: string; sweep: Sweep; onDone: (id: number) => void }) {
  const mover = useRef<HTMLDivElement>(null);
  const beyond = (sweep.width / (1 - sweep.width)) * 100;
  const [from, to] = sweep.dir === 'ltr' ? [-beyond, 100 + beyond] : [100 + beyond, -beyond];

  useEffect(() => {
    const el = mover.current;
    if (!el) return;
    const animation = el.animate(
      [
        { maskPosition: `${from}% 0`, webkitMaskPosition: `${from}% 0` },
        { maskPosition: `${to}% 0`, webkitMaskPosition: `${to}% 0` },
      ],
      { duration: sweep.ms, easing: 'ease-in-out', fill: 'forwards' }
    );
    animation.onfinish = () => onDone(sweep.id);
    return () => animation.cancel();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className="absolute inset-0"
      style={{ WebkitMaskImage: fadeAcross, maskImage: fadeAcross, opacity: sweep.strength }}
    >
      <div className="absolute inset-0" style={{ WebkitMaskImage: fadeDown, maskImage: fadeDown }}>
        <div
          ref={mover}
          className="absolute inset-0"
          style={{
            WebkitMaskImage: 'linear-gradient(90deg, transparent, black 50%, transparent)',
            maskImage: 'linear-gradient(90deg, transparent, black 50%, transparent)',
            WebkitMaskSize: `${sweep.width * 100}% 100%`,
            maskSize: `${sweep.width * 100}% 100%`,
            WebkitMaskRepeat: 'no-repeat',
            maskRepeat: 'no-repeat',
            // Start fully off the starting end, so nothing flashes before the animation.
            WebkitMaskPosition: `${from}% 0`,
            maskPosition: `${from}% 0`,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt=""
            draggable={false}
            className="object-cover blur-[17px] brightness-110 saturate-[2.8]"
            style={{ ...picture, height: '40px' }}
          />
        </div>
      </div>
    </div>
  );
}

export function CoverGlow({ src }: { src: string }) {
  // A stream of sweeps at random moments. Up to MAX_SWEEPS can overlap.
  const [sweeps, setSweeps] = useState<Sweep[]>([]);
  const nextId = useRef(0);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    let alive = true;
    const spawn = () => {
      if (!alive) return;
      setSweeps((current) =>
        current.length >= MAX_SWEEPS
          ? current
          : [
              ...current,
              {
                id: nextId.current++,
                dir: Math.random() < 0.5 ? 'ltr' : 'rtl',
                ms: rand(2800, 7000),
                width: rand(0.28, 0.55),
                strength: rand(0.65, 1),
              },
            ]
      );
      timer = setTimeout(spawn, rand(500, 3500));
    };
    timer = setTimeout(spawn, 700);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, []);
  const removeSweep = (id: number) => setSweeps((current) => current.filter((x) => x.id !== id));

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-3 top-[calc(100%-0.75rem)] motion-reduce:hidden"
    >
      {/* Fade-out downwards. Much taller and wider than what it holds, so it never cuts
          the blur off; its gradient reaches fully transparent before its own bottom. */}
      <div
        className="absolute opacity-0 animate-[glow-in_1.4s_ease-out_forwards]"
        style={{
          left: `-${MARGIN_X}`,
          right: `-${MARGIN_X}`,
          top: `-${MARGIN_TOP}`,
          height: '9rem',
          WebkitMaskImage: 'linear-gradient(to bottom, black 1.5rem, transparent 6rem)',
          maskImage: 'linear-gradient(to bottom, black 1.5rem, transparent 6rem)',
        }}
      >
        {/* Always-on glow, the picture's own colours. Its opacity runs 0% at the cover's
            left edge, 100% in the middle, 0% at the right edge: a mask on this wrapper
            (whose gradient stops are measured in from the wrapper's edges, so they land
            on the cover's edges), with the blur on the picture inside. It also breathes
            between 80% and 100% opacity every 5s (glow-pulse). */}
        <div
          className="absolute inset-0 animate-[glow-pulse_5s_ease-in-out_infinite]"
          style={{
            WebkitMaskImage: `linear-gradient(90deg, transparent ${MARGIN_X}, black 50%, transparent calc(100% - ${MARGIN_X}))`,
            maskImage: `linear-gradient(90deg, transparent ${MARGIN_X}, black 50%, transparent calc(100% - ${MARGIN_X}))`,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt=""
            draggable={false}
            className="object-cover blur-[20px] saturate-[1.8]"
            style={{ ...picture, left: MARGIN_X, top: MARGIN_TOP }}
          />
        </div>
        {sweeps.map((sweep) => (
          <GlowSweep key={sweep.id} src={src} sweep={sweep} onDone={removeSweep} />
        ))}
      </div>
    </div>
  );
}
