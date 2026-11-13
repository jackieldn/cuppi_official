'use client';

import { createContext, useContext, useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface RevealEntry {
  reveal: (delay: number) => void;
  stagger: number;
}

// A jump (anchor link, fast scroll) can bring many items into view at once; cap
// the cascade so the last of them never waits more than this.
const MAX_DELAY = 800;

// One shared observer for every Reveal on the page.
const entries = new Map<Element, RevealEntry>();
let observer: IntersectionObserver | null = null;

function getObserver(): IntersectionObserver {
  if (!observer) {
    observer = new IntersectionObserver(
      (batch) => {
        // Elements that come into view in the same callback cascade top to bottom,
        // each one `stagger` ms after the previous. Elements that scroll in later
        // form their own batch, so they never wait behind ones further up.
        const visible = batch
          .filter((e) => e.isIntersecting)
          .sort(
            (a, b) =>
              a.boundingClientRect.top - b.boundingClientRect.top ||
              a.boundingClientRect.left - b.boundingClientRect.left
          );
        visible.forEach((e, i) => {
          const item = entries.get(e.target);
          if (!item) return;
          observer?.unobserve(e.target);
          entries.delete(e.target);
          item.reveal(Math.min(i * item.stagger, MAX_DELAY));
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -8% 0px' }
    );
  }
  return observer;
}

interface RevealProps {
  children: ReactNode;
  className?: string;
  /** Extra delay (ms) between items that appear together, in page order. */
  stagger?: number;
  /** While true, stay hidden even if on screen; reveals (still in order) once released. */
  hold?: boolean;
}

const InstantContext = createContext(false);

/**
 * Inside this, every Reveal is already shown and does not wait for the scroll. For previews (the
 * admin's page builder) where the page sits in a scrolling box and nothing should be hidden.
 */
export function InstantReveal({ children }: { children: ReactNode }) {
  return <InstantContext.Provider value>{children}</InstantContext.Provider>;
}

/**
 * Fades its children up the first time they scroll into view (the same fade-up
 * as the Works page). Respects prefers-reduced-motion.
 */
export function Reveal({ children, className, stagger = 0, hold = false }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const instant = useContext(InstantContext);
  const [state, setState] = useState({ shown: instant, delay: 0 });

  useEffect(() => {
    const el = ref.current;
    if (!el || hold || instant) return;
    if (typeof IntersectionObserver === 'undefined') {
      setState({ shown: true, delay: 0 });
      return;
    }
    entries.set(el, { reveal: (delay) => setState({ shown: true, delay }), stagger });
    getObserver().observe(el);
    return () => {
      entries.delete(el);
      observer?.unobserve(el);
    };
  }, [stagger, hold, instant]);

  return (
    <div
      ref={ref}
      className={cn(
        'opacity-0 motion-reduce:opacity-100',
        state.shown && !instant && 'animate-[fade-in-up_0.6s_ease-out_forwards] motion-reduce:animate-none',
        instant && 'opacity-100',
        className
      )}
      // Lets children time their own animation to start after this fade-up
      // (see .skill-segment in globals.css).
      data-revealed={state.shown || undefined}
      style={{ animationDelay: `${state.delay}ms`, '--reveal-delay': `${state.delay}ms` } as CSSProperties}
    >
      {children}
    </div>
  );
}
