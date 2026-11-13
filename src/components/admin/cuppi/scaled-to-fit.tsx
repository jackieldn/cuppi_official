'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Draws its children at a fixed desktop width and scales them down to fit the column, so the
 * hero in the preview lays out exactly as it does on a desktop screen instead of being squeezed.
 * The pattern's cursor light already divides out ancestor scaling, so it still follows the pointer.
 */
export function ScaledToFit({ designWidth, children }: { designWidth: number; children: React.ReactNode }) {
  const outer = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState<{ scale: number; height: number } | null>(null);

  useEffect(() => {
    const o = outer.current;
    const i = inner.current;
    if (!o || !i) return;
    const measure = () => {
      const scale = Math.min(1, o.clientWidth / designWidth);
      // offsetHeight is the unscaled layout height, so the box can be sized to the scaled drawing.
      setFit({ scale, height: i.offsetHeight * scale });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(o);
    ro.observe(i);
    return () => ro.disconnect();
  }, [designWidth]);

  return (
    <div ref={outer} className="overflow-hidden rounded-xl" style={{ height: fit?.height, visibility: fit ? 'visible' : 'hidden' }}>
      <div ref={inner} style={{ width: designWidth, transform: `scale(${fit?.scale ?? 1})`, transformOrigin: 'top left' }}>
        {children}
      </div>
    </div>
  );
}
