'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * The hero's frame, and the director of its opening shot: the camera pulling back out of
 * the hero. It holds the hero in a "prep" state (everything zoomed in and unseen, so the
 * visitor first sees only the colour block), waits until everything the hero needs has been
 * downloaded, then switches to "play" and the CSS in globals.css does the move.
 *
 * Three layers, nearest last (see `.intro-far`, `.intro-near`, `.intro-late` in globals.css):
 * the pattern drifts back slowest, the text and phone move a little faster, and the button
 * fades up when they have settled.
 *
 * It cannot leave the hero hidden: if something never finishes loading it plays after 6
 * seconds anyway, and with no JavaScript at all CSS reveals it after 8. People who prefer
 * reduced motion see no movement.
 */
export function HeroIntro({
  patternUrl,
  className,
  children,
}: {
  /** The pattern is a CSS background, so nothing waits for it unless we do it here. */
  patternUrl?: string;
  className?: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<'prep' | 'play'>('prep');

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setState('play');
      return;
    }

    let cancelled = false;
    const play = () => {
      if (!cancelled) setState('play');
    };

    const settle = (img: HTMLImageElement) =>
      img.complete
        ? (img.decode?.() ?? Promise.resolve()).catch(() => {})
        : new Promise<void>((resolve) => {
            img.addEventListener('load', () => resolve(), { once: true });
            img.addEventListener('error', () => resolve(), { once: true });
          });

    const waits: Promise<unknown>[] = [
      document.readyState === 'complete' ? Promise.resolve() : new Promise((r) => window.addEventListener('load', r, { once: true })),
      document.fonts?.ready ?? Promise.resolve(),
      ...Array.from(root.querySelectorAll('img')).map(settle),
    ];
    if (patternUrl) {
      waits.push(
        new Promise<void>((resolve) => {
          const img = new Image();
          img.onload = img.onerror = () => resolve();
          img.src = patternUrl;
        }),
      );
    }

    // Two frames after the last download, so the zoomed-in state has been painted before we move.
    Promise.all(waits).then(() => requestAnimationFrame(() => requestAnimationFrame(play)));
    const failsafe = window.setTimeout(play, 6000);
    return () => {
      cancelled = true;
      window.clearTimeout(failsafe);
    };
  }, [patternUrl]);

  return (
    <div ref={ref} data-intro={state} data-spotlight-host className={className}>
      {children}
    </div>
  );
}
