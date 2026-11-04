'use client';

// The Time Machine leaving 2026: the desktop breaks up like a signal with
// interference. The whole page is torn sideways in bands and its colour
// channels split (an SVG filter on <html>, re-rolled every frame step), with
// bars of noise over the top. It builds up, fades through soft grey and cuts
// to black, and then DosScreen switches the CRT on.
//
// Kept gentle for photosensitive visitors (WCAG 2.3.1: nothing big and
// bright flashing more than 3 times a second): no white or inverted bars, no
// whole-page on/off flicker, and the closing flash is a dim grey fade, not a
// white frame. Reduced-motion visitors skip all of it (see DosScreen).

import { useEffect, useRef, useState } from 'react';

export const GLITCH_MS = 1100;
// How often the tearing changes. Real interference doesn't move smoothly.
const STEP_MS = 110;
const FLASH_MS = 180;
const FILTER_ID = 'jackdos-glitch';

type Bar = { top: number; height: number; color: string; shift: number; blend: 'screen' | 'normal' };

// Dim tints and dark bars only: none of them much brighter than the page.
const BAR_COLORS = ['rgba(150,150,150,0.3)', 'rgba(0,170,170,0.3)', 'rgba(170,0,170,0.28)', 'rgba(0,0,0,0.55)'];

function randomBars(intensity: number): Bar[] {
  const count = Math.round(1 + intensity * 5);
  return Array.from({ length: count }, () => ({
    top: Math.random() * 100,
    height: 0.4 + Math.random() * (1.5 + intensity * 5),
    color: BAR_COLORS[Math.floor(Math.random() * BAR_COLORS.length)],
    shift: (Math.random() - 0.5) * 40 * intensity,
    blend: Math.random() < 0.5 ? 'screen' : 'normal',
  }));
}

export function TimeGlitch() {
  const [bars, setBars] = useState<Bar[]>([]);
  const [flash, setFlash] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const html = document.documentElement;
    const svg = svgRef.current;
    const turbulence = svg?.querySelector('feTurbulence');
    const displace = svg?.querySelector('feDisplacementMap');
    const red = svg?.querySelector<SVGFEOffsetElement>('#jackdos-red');
    const cyan = svg?.querySelector<SVGFEOffsetElement>('#jackdos-cyan');
    const previousFilter = html.style.filter;
    const started = performance.now();

    const tick = () => {
      const t = Math.min(1, (performance.now() - started) / (GLITCH_MS - FLASH_MS));
      // Mild to heavy. The filter stays on throughout: switching it off and on
      // would flicker the whole page.
      const intensity = t * t;
      turbulence?.setAttribute('seed', String(Math.floor(Math.random() * 1000)));
      turbulence?.setAttribute('baseFrequency', `0.00001 ${0.02 + Math.random() * 0.12}`);
      displace?.setAttribute('scale', String(6 + intensity * 90 * Math.random()));
      const split = 2 + intensity * 10;
      red?.setAttribute('dx', String(split * (Math.random() < 0.5 ? 1 : -1)));
      cyan?.setAttribute('dx', String(-split * (Math.random() < 0.5 ? 1 : -1)));
      html.style.filter = `url(#${FILTER_ID})`;
      setBars(randomBars(intensity));
    };

    tick();
    const timer = setInterval(tick, STEP_MS);
    const flashTimer = setTimeout(() => {
      clearInterval(timer);
      html.style.filter = previousFilter;
      setBars([]);
      setFlash(true);
    }, GLITCH_MS - FLASH_MS);

    return () => {
      clearInterval(timer);
      clearTimeout(flashTimer);
      html.style.filter = previousFilter;
    };
  }, []);

  return (
    <>
      {/* The filter the whole page is drawn through while it breaks up. */}
      <svg ref={svgRef} aria-hidden="true" className="pointer-events-none fixed h-0 w-0">
        <filter id={FILTER_ID} x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
          {/* Horizontal bands of noise: almost no change across, lots down. */}
          <feTurbulence type="fractalNoise" baseFrequency="0.00001 0.08" numOctaves="1" seed="1" result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="30" xChannelSelector="R" yChannelSelector="B" result="torn" />
          {/* Split red from green and blue, and push them apart. */}
          <feColorMatrix in="torn" type="matrix" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" result="redOnly" />
          <feOffset id="jackdos-red" in="redOnly" dx="4" dy="0" result="redShift" />
          <feColorMatrix in="torn" type="matrix" values="0 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 1 0" result="cyanOnly" />
          <feOffset id="jackdos-cyan" in="cyanOnly" dx="-4" dy="0" result="cyanShift" />
          <feBlend in="redShift" in2="cyanShift" mode="screen" />
        </filter>
      </svg>

      <div aria-hidden="true" className="pointer-events-none fixed inset-0 overflow-hidden">
        {bars.map((b, i) => (
          <div
            key={i}
            className="absolute inset-x-0"
            style={{
              top: `${b.top}%`,
              height: `${b.height}%`,
              background: b.color,
              mixBlendMode: b.blend,
              transform: `translateX(${b.shift}px)`,
            }}
          />
        ))}
        {/* Rolling scanlines and static over everything. */}
        <div
          className="absolute inset-0 opacity-40"
          style={{
            background:
              'repeating-linear-gradient(to bottom, rgba(255,255,255,0.06) 0px, rgba(255,255,255,0.06) 1px, transparent 1px, transparent 3px)',
          }}
        />
        {/* A soft grey fade, not a white frame (see the note at the top). */}
        {flash && (
          <div
            className="absolute inset-0 animate-in fade-in duration-150"
            style={{ background: 'rgba(130,130,130,0.4)' }}
          />
        )}
      </div>
    </>
  );
}
