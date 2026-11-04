'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface ShineCardProps {
  children: ReactNode;
  className?: string;
}

// How long (ms) the glow takes to close about 63% of the gap to the cursor. Bigger is
// lazier: the glow trails further behind and drifts to a stop after the cursor does.
const FOLLOW_MS = 220;

/**
 * A card whose background catches a soft light that trails the cursor: the glow eases
 * toward the pointer rather than sticking to it, so it drifts after the cursor and
 * settles a moment after it stops. The light is a layer of its own, painted between the
 * card's background and its content, so only the background is lit; the content (text,
 * picture) is never touched by it.
 *
 * Positions go straight onto the element as CSS variables, one animation frame at a
 * time (no state, so nothing re-renders). Mouse only: a tap on a phone shows no shine.
 */
export function ShineCard({ children, className }: ShineCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const target = useRef({ x: 0, y: 0 });
  const glow = useRef({ x: 0, y: 0 });
  const hovering = useRef(false);
  const frame = useRef(0);
  const lastTime = useRef(0);

  const draw = () => {
    cardRef.current?.style.setProperty('--shine-x', `${glow.current.x}px`);
    cardRef.current?.style.setProperty('--shine-y', `${glow.current.y}px`);
  };

  const tick = (now: number) => {
    // Frame-rate independent easing: the same lag on a 60 Hz and a 144 Hz screen.
    const dt = Math.min(64, now - lastTime.current);
    lastTime.current = now;
    const k = 1 - Math.exp(-dt / FOLLOW_MS);
    glow.current.x += (target.current.x - glow.current.x) * k;
    glow.current.y += (target.current.y - glow.current.y) * k;
    draw();
    const settled =
      Math.abs(target.current.x - glow.current.x) < 0.1 && Math.abs(target.current.y - glow.current.y) < 0.1;
    // Keep going until it has caught up, even after the cursor has left.
    frame.current = settled ? 0 : requestAnimationFrame(tick);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (e.pointerType !== 'mouse') return;
    const card = cardRef.current;
    if (!card) return;
    const r = card.getBoundingClientRect();
    target.current = { x: e.clientX - r.left, y: e.clientY - r.top };

    if (!hovering.current) {
      // Just arrived: the glow appears under the cursor, then trails it from there.
      hovering.current = true;
      glow.current = { ...target.current };
      draw();
      card.style.setProperty('--shine', '1');
    }
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      glow.current = { ...target.current };
      draw();
      return;
    }
    if (!frame.current) {
      lastTime.current = performance.now();
      frame.current = requestAnimationFrame(tick);
    }
  };

  const handlePointerLeave = () => {
    hovering.current = false;
    // The glow keeps drifting toward where the cursor left while it fades out.
    cardRef.current?.style.setProperty('--shine', '0');
  };

  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  return (
    <div
      ref={cardRef}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      className={cn('relative', className)}
    >
      {/* The light. Inside the card's border, with the card's rounded corners. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-[inherit]"
        style={{
          background:
            'radial-gradient(420px circle at var(--shine-x, 50%) var(--shine-y, 50%), hsl(var(--card-foreground) / 0.11), hsl(var(--card-foreground) / 0.04) 45%, transparent 75%)',
          opacity: 'var(--shine, 0)',
          transition: 'opacity 500ms ease-out',
        }}
      />
      <div className="relative">{children}</div>
    </div>
  );
}
