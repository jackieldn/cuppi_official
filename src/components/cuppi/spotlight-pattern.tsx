'use client';

import { useEffect, useRef } from 'react';
import { PATTERN_DEFAULTS, patternLayers, type PatternName } from '@/lib/patterns';
import { patternUrl } from './pattern-overlay';

/**
 * A PatternOverlay that also lights up under the cursor: a soft circle where the pattern
 * rises to `spot` opacity. It follows the pointer with a little ease, fades in as the pointer
 * enters the block and out as it leaves.
 *
 * Mouse and pen only. With no hover (touch screens) or with reduced motion switched on,
 * it stays the plain pattern. The movement is written straight to CSS variables from an
 * animation frame loop that stops when everything has settled, so React never re-renders.
 */
export function SpotlightPattern({
  pattern,
  focus,
  shape = 'circle',
  size = PATTERN_DEFAULTS.size,
  centre = PATTERN_DEFAULTS.centre,
  edge = PATTERN_DEFAULTS.edge,
  spot = 0.5,
  radius = 190,
}: {
  pattern: PatternName | string;
  focus: string;
  shape?: 'circle' | 'ellipse';
  size?: number;
  centre?: number;
  edge?: number;
  /** The opacity the pattern rises to under the cursor. */
  spot?: number;
  radius?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const { opacity, mask } = patternLayers({ shape, focus, centre, edge, spot, radius });

  useEffect(() => {
    const el = ref.current;
    // The block the pointer moves over: marked explicitly when the pattern sits inside extra layers.
    const host = el?.closest<HTMLElement>('[data-spotlight-host]') ?? el?.parentElement;
    if (!el || !host) return;
    if (!window.matchMedia('(hover: hover)').matches || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    // Target (where the pointer is) and current (where the light is) positions and strength.
    let tx = 0, ty = 0, ts = 0;
    let x = 0, y = 0, s = 0;
    let inside = false;
    let frame = 0;

    const draw = () => {
      el.style.setProperty('--mx', `${x.toFixed(1)}px`);
      el.style.setProperty('--my', `${y.toFixed(1)}px`);
      el.style.setProperty('--spot', s.toFixed(3));
    };
    const tick = () => {
      x += (tx - x) * 0.2;
      y += (ty - y) * 0.2;
      s += (ts - s) * 0.12;
      const settled = Math.abs(tx - x) < 0.5 && Math.abs(ty - y) < 0.5 && Math.abs(ts - s) < 0.01;
      if (settled) {
        x = tx; y = ty; s = ts;
        frame = 0;
      } else {
        frame = requestAnimationFrame(tick);
      }
      draw();
    };
    const kick = () => {
      if (!frame) frame = requestAnimationFrame(tick);
    };

    const onMove = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return;
      // While the hero's intro is scaling this layer, the on-screen box is bigger than its layout box;
      // divide that out so the light lands exactly under the pointer.
      const r = el.getBoundingClientRect();
      const k = el.offsetWidth / r.width || 1;
      tx = (e.clientX - r.left) * k;
      ty = (e.clientY - r.top) * k;
      ts = 1;
      if (!inside) {
        // First contact: start the light right under the pointer rather than flying in from a corner.
        inside = true;
        x = tx;
        y = ty;
      }
      kick();
    };
    const onLeave = () => {
      inside = false;
      ts = 0;
      kick();
    };

    host.addEventListener('pointermove', onMove);
    host.addEventListener('pointerleave', onLeave);
    return () => {
      host.removeEventListener('pointermove', onMove);
      host.removeEventListener('pointerleave', onLeave);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div
      ref={ref}
      aria-hidden
      className="pointer-events-none absolute inset-0"
      style={{
        backgroundImage: `url(${patternUrl(pattern)})`,
        backgroundSize: `${size}px`,
        backgroundRepeat: 'repeat',
        opacity,
        WebkitMaskImage: mask,
        maskImage: mask,
        // Start with the light off and out of sight until the pointer arrives.
        ['--spot' as string]: 0,
      }}
    />
  );
}
