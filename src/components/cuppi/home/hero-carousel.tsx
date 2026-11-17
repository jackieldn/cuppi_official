'use client';

import { Children, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import type { FeatureTint } from '@/lib/features-types';
import { TINTS } from '../blocks/tints';
import { HeroSlideContext } from './hero-slide';

/**
 * Turns the home page's heroes into a slideshow. The heroes (its children) sit on top of one another, so the block is as tall
 * as the tallest and nothing jumps when they change; the one showing fades in over the last, and then plays its opening shot
 * (the camera pulling back) just as the first one did when the page loaded (see HeroIntro).
 *
 * Underneath, a row of dots with a long line for the hero on show. The line fills from left to right over `holdSeconds`, like a
 * countdown, and when it is full the next hero takes over: the full line shrinks into a dot while the next hero's dot grows into
 * the new line. A dot goes straight to its hero.
 *
 * The countdown is a clock kept here, not a CSS animation: it counts only while it can be seen to count. It starts when the hero's
 * opening shot does (so every hero gets the same time, the first included). It keeps counting while the pointer is over the
 * slideshow, and holds still only while a keyboard user is inside it, while the slideshow is scrolled out of view, and while the
 * tab is hidden. Time spent held is not lost: it carries on from where it stopped. With reduced motion it never moves on its own.
 */
export function HeroCarousel({
  tints,
  holdSeconds,
  children,
}: {
  /** The colour of each hero, in order, so the dots can be set in a colour that reads on it. */
  tints: FeatureTint[];
  holdSeconds: number;
  children: ReactNode;
}) {
  const slides = Children.toArray(children);
  const count = slides.length;
  const [active, setActive] = useState(0);
  /** The hero whose opening shot has started, once it has: the countdown does not run until then. */
  const [playing, setPlaying] = useState<number | null>(null);
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [inView, setInView] = useState(true);
  const [reduced, setReduced] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  /** The line's fill inside each hero's dot; only the one on show is moving, the rest are empty (or emptying, after their turn). */
  const fills = useRef<(HTMLSpanElement | null)[]>([]);
  /** How much of the hold has been counted, in milliseconds. Kept out of state so a frame of counting does not redraw the page. */
  const elapsed = useRef(0);

  useEffect(() => {
    const update = () => setHidden(document.visibilityState === 'hidden');
    update();
    document.addEventListener('visibilitychange', update);
    return () => document.removeEventListener('visibilitychange', update);
  }, []);

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    const el = root.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // If the list shrinks (heroes removed in the admin while the page is open), never point past the end.
  const shown = Math.min(active, count - 1);
  const go = useCallback((to: number) => {
    elapsed.current = 0;
    setPlaying(null);
    setActive(to);
  }, []);
  const reportPlay = useCallback((index: number) => setPlaying(index), []);
  const tint = TINTS[tints[shown] ?? 'honey'];
  const paused = focused || hidden || !inView;
  const running = !reduced && count > 1 && playing === shown && !paused;

  useEffect(() => {
    if (!running) return;
    const hold = holdSeconds * 1000;
    let frame = 0;
    let last = performance.now();
    const tick = (now: number) => {
      // A frame that took long (a busy phone) counts as a short one, so the line slows down instead of skipping ahead.
      elapsed.current += Math.min(now - last, 100);
      last = now;
      const progress = Math.min(elapsed.current / hold, 1);
      const line = fills.current[shown];
      if (line) line.style.transform = `scaleX(${progress})`;
      if (progress >= 1) {
        go((shown + 1) % count);
        return;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [running, shown, count, holdSeconds, go]);

  // The hero on show starts with an empty line (or a full one, with reduced motion). The one that has just had its turn keeps its full
  // line while it shrinks into a dot and fades to the dot's look, and is emptied once that is done, ready for its next turn.
  useEffect(() => {
    const line = fills.current[shown];
    if (line) line.style.transform = reduced ? 'scaleX(1)' : 'scaleX(0)';
    const t = window.setTimeout(() => {
      fills.current.forEach((el, i) => {
        if (el && i !== shown) el.style.transform = 'scaleX(0)';
      });
    }, 700);
    return () => window.clearTimeout(t);
  }, [shown, reduced]);

  const contexts = useMemo(
    () => slides.map((_, index) => ({ index, active: index === shown, reportPlay })),
    // `slides` is a new array on every render; only how many there are, and which is showing, matter.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [count, shown, reportPlay],
  );

  return (
    <div
      ref={root}
      className="relative w-full"
      role="region"
      aria-roledescription="carousel"
      aria-label="What's new"
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
            <HeroSlideContext.Provider value={contexts[i]}>{slide}</HeroSlideContext.Provider>
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
            {slides.map((_, i) => {
              const on = i === shown;
              return (
                // The same button for every hero, so its width can move: the one on show is a line, the others are dots. The button is
                // a roomy target; the line or dot is the span inside it.
                <button
                  key={i}
                  type="button"
                  disabled={on}
                  aria-label={on ? `Showing ${i + 1} of ${count}` : `Show ${i + 1} of ${count}`}
                  aria-current={on || undefined}
                  onClick={() => go(i)}
                  className="group flex h-6 items-center justify-center rounded-full px-[5px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current disabled:cursor-default"
                >
                  <span
                    className={cn(
                      'relative block h-2 overflow-hidden rounded-full transition-[width] duration-500 ease-[cubic-bezier(0.45,0,0.2,1)] motion-reduce:transition-none',
                      on ? 'w-16 sm:w-24' : 'w-2',
                    )}
                  >
                    <span
                      className={cn(
                        'absolute inset-0 bg-current transition-opacity duration-500 motion-reduce:transition-none',
                        on ? 'opacity-25' : 'opacity-40 group-hover:opacity-80',
                      )}
                    />
                    {/* Starts empty; the clock above moves it (the style is the same on every render, so React leaves it alone). */}
                    <span
                      ref={(el) => {
                        fills.current[i] = el;
                      }}
                      className={cn('hero-countdown absolute inset-0 bg-current transition-opacity duration-500 motion-reduce:transition-none', on ? 'opacity-100' : 'opacity-0')}
                      style={{ transform: 'scaleX(0)' }}
                    />
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
