'use client';

import { useEffect, useRef, useState } from 'react';

const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

/**
 * `target`, but eased: when the numbers change, what comes back moves from where it was to the new values over `ms`
 * (and picks up from wherever it has got to if they change again meanwhile). Used to make chart lines and bars glide.
 * `grow`: values that are new (the array got longer) start from zero and grow; otherwise they simply appear.
 * Visitors who ask for reduced motion get the new values at once. The first render, and the server's, is `target` itself.
 */
export function useTweened(target: number[], { ms = 650, grow = false }: { ms?: number; grow?: boolean } = {}): number[] {
  const [shown, setShown] = useState(target);
  const current = useRef(target);
  const frame = useRef(0);
  const key = target.join(',');

  useEffect(() => {
    const to = key === '' ? [] : key.split(',').map(Number);
    const reduced = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const from = to.map((v, i) => current.current[i] ?? (grow ? 0 : v));
    if (reduced || from.every((v, i) => v === to[i])) {
      current.current = to;
      setShown(to);
      return;
    }
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / ms);
      const e = easeOut(t);
      const next = to.map((v, i) => from[i] + (v - from[i]) * e);
      current.current = next;
      setShown(next);
      if (t < 1) frame.current = requestAnimationFrame(tick);
    };
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame.current);
  }, [key, ms, grow]);

  // For the one render between "the numbers changed" and "the glide starts", fill gaps so the caller always gets as many values as it asked for.
  return target.map((v, i) => shown[i] ?? (grow ? 0 : v));
}
