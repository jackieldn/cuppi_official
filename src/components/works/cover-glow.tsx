'use client';

import { Fragment, useEffect, useRef, useState } from 'react';

/**
 * Ambient glow for the project cover, in two parts, the same trick as the home-page
 * video: a blurred copy of the picture itself, so the light is the picture's own colours.
 *
 * CoverGlow is the base: a pulsing glow that spills out below the cover. The copy is
 * mirrored (flipped vertically and bottom-aligned) so the row just below the cover is
 * the picture's bottom row. Place it inside the cover's `relative` box, BEFORE the
 * picture, so it paints behind it.
 *
 * CoverSweeps is the stronger, smaller part: brighter highlights that sweep along the
 * picture's bottom edge, one at a time or a few overlapping, each launched at a random
 * moment with a random direction (left to right or right to left), speed, width and
 * strength. They glow on the picture, fading up from its bottom edge, and spill out
 * below it. The picture's bottom edge is mirrored, so the light is continuous across
 * it. Place it inside the cover's tilting box, AFTER the (clipped) picture.
 *
 * A CSS mask clips whatever it is applied to at that element's box, blur spill
 * included. So the base glow's masks sit on wrapper boxes much bigger than the blurred
 * pictures inside them (MARGIN_X / MARGIN_TOP), and never on a blurred element itself.
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

// The light leak at the picture's bottom edge, the same recipe as the home-page video
// and the bottom-of-page glow: a hot rim of the picture's own bottom rows, brightened and
// screened over its edge, dropping fast below it; plus a thin bright streak right on the
// edge. Fades are masks on wrappers (never on a blurred element, which would cut its blur off).
const LEAK_OVER = '1.25rem'; // how far up into the picture the rim is at full strength
const LEAK_H = '5rem'; // the rim's box: LEAK_OVER above the edge, the rest below it
const FADE_SIDES = 'linear-gradient(90deg, transparent, black 16%, black 84%, transparent)';
const FADE_RIM = `linear-gradient(to bottom, transparent, black ${LEAK_OVER}, rgba(0, 0, 0, 0.225) calc(${LEAK_OVER} + 1rem), rgba(0, 0, 0, 0.06) calc(${LEAK_OVER} + 2.25rem), transparent ${LEAK_H})`;
// Under the cover, the base haze: strongest at the edge, then a fast drop and a faint tail.
const FADE_BASE =
  'linear-gradient(to bottom, black 1.5rem, rgba(0, 0, 0, 0.3) 2.75rem, rgba(0, 0, 0, 0.11) 4.5rem, transparent 7rem)';

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

const SWEEP_OVER = '1rem'; // how far up into the picture the strong glow reaches
const SWEEP_SPILL = '0.75rem'; // how far below the picture it fades out
const SWEEP_MARGIN = '3.5rem'; // room above and below for the blur, so masks never cut it off

// Heights in the sweep box, which runs from SWEEP_MARGIN above the glow's top to well below it.
const sweepEdge = `calc(${SWEEP_OVER} + ${SWEEP_MARGIN})`; // y of the picture's bottom edge
const sweepFadeAcross = `linear-gradient(90deg, transparent ${MARGIN_X}, rgba(0, 0, 0, 0.8) 50%, transparent calc(100% - ${MARGIN_X}))`;
const sweepFadeV = `linear-gradient(to bottom, transparent ${SWEEP_MARGIN}, black ${sweepEdge}, transparent calc(${sweepEdge} + ${SWEEP_SPILL}))`;

const sweepLayer = {
  position: 'absolute',
  left: MARGIN_X,
  width: `calc(100% - 2 * ${MARGIN_X})`,
  objectPosition: 'bottom',
} as const;

/**
 * One brighter pass. Each effect has its own wrapper so the masks (which multiply)
 * never share an element: the 0-80-0 fade across the cover, then the vertical fade,
 * then the moving window. The window is animated with the Web Animations API from fully
 * off one end to fully off the other; for a window of width w (as a fraction), a
 * mask-position of -w/(1-w) * 100% is just off the left end.
 *
 * The picture is drawn twice, blurred together as one: its bottom rows as they are
 * (the glow on the picture), and the same rows flipped below the edge (the spill).
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
      style={{ WebkitMaskImage: sweepFadeAcross, maskImage: sweepFadeAcross, opacity: sweep.strength }}
    >
      <div className="absolute inset-0" style={{ WebkitMaskImage: sweepFadeV, maskImage: sweepFadeV }}>
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
          <div className="absolute inset-0 blur-[24.5px] brightness-110 saturate-[2.8]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt=""
              draggable={false}
              className="object-cover"
              style={{ ...sweepLayer, top: SWEEP_MARGIN, height: SWEEP_OVER }}
            />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt=""
              draggable={false}
              className="object-cover"
              style={{ ...sweepLayer, top: sweepEdge, height: `calc(${SWEEP_SPILL} + 0.25rem)`, transform: 'scaleY(-1)' }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * The hot rim and the streak, both from the picture's own bottom rows. Sits in the
 * zero-height line along the picture's bottom edge, so it tilts with the picture.
 */
function CoverLeak({ src }: { src: string }) {
  const strip = { position: 'absolute', left: 0, width: '100%', objectPosition: 'bottom' } as const;
  return (
    <div className="absolute inset-0 opacity-0 animate-[glow-in_1.4s_ease-out_forwards]">
      {/* The rim: the picture's last rows over its edge, and the same rows mirrored below it. */}
      <div
        className="absolute inset-x-0 animate-[bottom-glow-swell-a_11s_ease-in-out_infinite]"
        style={{
          top: `-${LEAK_OVER}`,
          height: LEAK_H,
          mixBlendMode: 'screen',
          WebkitMaskImage: FADE_RIM,
          maskImage: FADE_RIM,
        }}
      >
        <div className="absolute inset-0" style={{ WebkitMaskImage: FADE_SIDES, maskImage: FADE_SIDES }}>
          <div className="absolute inset-0 blur-[14px] brightness-[1.6] saturate-[2]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt=""
              draggable={false}
              className="object-cover"
              style={{ ...strip, top: 0, height: LEAK_OVER }}
            />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt=""
              draggable={false}
              className="object-cover"
              style={{ ...strip, top: LEAK_OVER, height: `calc(${LEAK_H} - ${LEAK_OVER})`, transform: 'scaleY(-1)' }}
            />
          </div>
        </div>
      </div>
      {/* The streak: a thin, bright line right on the edge, flickering like a lens flare. */}
      <div
        className="absolute inset-x-5 -bottom-px h-[3px] animate-[bottom-glow-flicker_7s_linear_infinite]"
        style={{ mixBlendMode: 'screen', WebkitMaskImage: FADE_SIDES, maskImage: FADE_SIDES }}
      >
        <div className="h-full w-full blur-[1px] brightness-[1.9] saturate-[1.6]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt=""
            draggable={false}
            className="object-cover"
            style={{ ...strip, top: 0, height: '100%' }}
          />
        </div>
      </div>
    </div>
  );
}

/** The stream of highlights at the picture's bottom edge. Up to MAX_SWEEPS can overlap. */
export function CoverSweeps({ src }: { src: string }) {
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
                ms: rand(5600, 14000),
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
    // A zero-height line along the picture's bottom edge; the sweep box hangs off it.
    <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-0 motion-reduce:hidden">
      <CoverLeak src={src} />
      <div
        className="absolute opacity-0 animate-[glow-in_1.4s_ease-out_forwards]"
        style={{
          left: `-${MARGIN_X}`,
          right: `-${MARGIN_X}`,
          top: `calc(-1 * ${sweepEdge})`,
          height: `calc(${sweepEdge} + 7rem)`,
          // Screened onto the picture so the light is its own colours; off the picture it
          // has nothing to blend with and simply shows.
          mixBlendMode: 'screen',
        }}
      >
        {/* Each pass is drawn twice, in step, which doubles its light: opacity alone tops out at 100%. */}
        {sweeps.map((sweep) => (
          <Fragment key={sweep.id}>
            <GlowSweep src={src} sweep={sweep} onDone={removeSweep} />
            <GlowSweep src={src} sweep={sweep} onDone={removeSweep} />
          </Fragment>
        ))}
      </div>
    </div>
  );
}

/** The base glow: pulses below the cover, behind the picture. */
export function CoverGlow({ src }: { src: string }) {
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
          WebkitMaskImage: FADE_BASE,
          maskImage: FADE_BASE,
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
      </div>
    </div>
  );
}
