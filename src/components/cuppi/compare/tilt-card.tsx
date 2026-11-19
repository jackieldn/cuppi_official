'use client';

import type { PointerEvent, ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { SHINE_STYLE, TILT_TRANSFORM, useCursorTilt } from '@/lib/use-cursor-tilt';

/**
 * A card that tilts toward the cursor with a soft shine, the same effect as the cards on the portfolio's Works page
 * (see use-cursor-tilt). Give it the card's own look through `className` (colour, padding, corners; the corners must be
 * rounded-[2rem] so the shine clips to them). Mouse only, and off for people who ask for less motion.
 */
export function TiltCard({ className, children }: { className?: string; children: ReactNode }) {
  const { wrapperRef, tiltRef, onPointerMove, onPointerLeave } = useCursorTilt<HTMLDivElement>();

  const move = (e: PointerEvent) => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    onPointerMove(e);
  };

  return (
    // The wrapper holds still and is what the cursor is measured against; only the inner card tilts.
    <div ref={wrapperRef} className="h-full">
      <div
        ref={tiltRef}
        onPointerMove={move}
        onPointerLeave={onPointerLeave}
        className={cn('relative h-full transition-shadow duration-300 hover:shadow-[0_20px_32px_rgb(var(--c-shadow)/0.14)]', className)}
        style={{ transform: TILT_TRANSFORM, transition: 'transform 220ms ease-out, box-shadow 300ms ease-out' }}
      >
        {children}
        <div aria-hidden className="pointer-events-none absolute inset-0 rounded-[2rem]" style={SHINE_STYLE} />
      </div>
    </div>
  );
}
