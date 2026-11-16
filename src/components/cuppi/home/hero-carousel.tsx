'use client';

import { Children, useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import type { FeatureTint } from '@/lib/features-types';
import { TINTS } from '../blocks/tints';

/**
 * Turns the home page's heroes into a slideshow. The heroes (its children) sit on top of one another, so the block is as tall
 * as the tallest and nothing jumps when they change; the one showing fades in over the last.
 *
 * Underneath, a row of dots with a long line for the hero on show. The line fills from left to right over `holdSeconds`, like a
 * countdown, and when it is full the next hero takes over. A dot goes straight to its hero. The countdown holds still while the
 * pointer is over the slideshow, while a keyboard user is inside it, and while the tab is hidden; with reduced motion it never
 * moves on its own. The first line waits `firstDelaySeconds` so the opening shot is not cut short.
 */
export function HeroCarousel({
  tints,
  holdSeconds,
  firstDelaySeconds = 0,
  children,
}: {
  /** The colour of each hero, in order, so the dots can be set in a colour that reads on it. */
  tints: FeatureTint[];
  holdSeconds: number;
  firstDelaySeconds?: number;
  children: ReactNode;
}) {
  const slides = Children.toArray(children);
  const count = slides.length;
  const [active, setActive] = useState(0);
  /** True until the first change: only the first countdown waits for the opening shot. */
  const [first, setFirst] = useState(true);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const update = () => setHidden(document.visibilityState === 'hidden');
    update();
    document.addEventListener('visibilitychange', update);
    return () => document.removeEventListener('visibilitychange', update);
  }, []);

  // If the list shrinks (heroes removed in the admin while the page is open), never point past the end.
  const shown = Math.min(active, count - 1);
  const go = (to: number) => {
    setFirst(false);
    setActive(to);
  };
  const tint = TINTS[tints[shown] ?? 'honey'];
  const paused = hovered || focused || hidden;

  return (
    <div
      className="relative w-full"
      role="region"
      aria-roledescription="carousel"
      aria-label="What's new"
      onPointerEnter={(e) => e.pointerType === 'mouse' && setHovered(true)}
      onPointerLeave={(e) => e.pointerType === 'mouse' && setHovered(false)}
      onFocus={(e) => e.target.matches(':focus-visible') && setFocused(true)}
      onBlur={(e) => !e.currentTarget.contains(e.relatedTarget as Node | null) && setFocused(false)}
    >
      <div className="grid">
        {slides.map((slide, i) => (
          <div
            key={i}
            role="group"
            aria-roledescription="slide"
            aria-label={`${i + 1} of ${count}`}
            aria-hidden={i !== shown}
            className={cn(
              'col-start-1 row-start-1 transition-[opacity,visibility] duration-700',
              i === shown ? 'visible opacity-100' : 'invisible opacity-0',
            )}
          >
            {slide}
          </div>
        ))}
      </div>

      {/* Over the bottom edge of the hero block, which has the same width and side margins as the hero itself. */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 px-3 sm:px-6">
        <div className="mx-auto flex max-w-6xl justify-center pb-4 sm:pb-5">
          <div
            role="group"
            aria-label="Choose what to show"
            className={cn(
              'pointer-events-auto flex items-center rounded-full px-3 py-1.5 backdrop-blur-md transition-colors duration-500',
              tint.text,
              tint.dark ? 'bg-black/35' : 'bg-cuppi-paper/70',
            )}
          >
            {slides.map((_, i) =>
              i === shown ? (
                <span
                  key={`line-${i}`}
                  role="img"
                  aria-label={`Showing ${i + 1} of ${count}`}
                  className="relative mx-1.5 block h-1.5 w-16 overflow-hidden rounded-full sm:w-24"
                >
                  <span className="absolute inset-0 bg-current opacity-25" />
                  <span
                    className="hero-countdown absolute inset-0 bg-current"
                    data-paused={paused}
                    style={{ '--hero-hold': `${holdSeconds}s`, '--hero-delay': first ? `${firstDelaySeconds}s` : '0s' } as CSSProperties}
                    onAnimationEnd={(e) => e.animationName === 'hero-countdown' && go((shown + 1) % count)}
                  />
                </span>
              ) : (
                <button
                  key={`dot-${i}`}
                  type="button"
                  aria-label={`Show ${i + 1} of ${count}`}
                  onClick={() => go(i)}
                  className="group flex h-6 w-6 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current"
                >
                  <span className="block h-2 w-2 rounded-full bg-current opacity-40 transition-opacity group-hover:opacity-80" />
                </button>
              ),
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
