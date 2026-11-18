'use client';

import { useEffect, useRef, useState } from 'react';
import { useAssetsReady } from '@/lib/use-assets-ready';
import { useHeroSlide } from './hero-slide';

/** How long a hero that has just been replaced stays as it was, so it is not stripped bare while the next one fades over it. */
const LINGER_MS = 1000;

/**
 * The hero's frame, and the director of its opening shot: the camera pulling back out of
 * the hero. It holds the hero in a "prep" state (everything zoomed in and unseen, so the
 * visitor first sees only the colour block), waits until everything the hero needs has been
 * downloaded, then switches to "play" and the CSS in globals.css does the move.
 *
 * Four layers, nearest last (see `.intro-far`, `.intro-mid`, `.intro-near`, `.intro-late` in globals.css):
 * the pattern drifts back slowest, the text moves faster, the phone fastest, and the button
 * fades up when they have settled.
 *
 * It cannot leave the hero hidden: if something never finishes loading it plays after 6
 * seconds anyway, and with no JavaScript at all CSS reveals it after 8. People who prefer
 * reduced motion see no movement.
 *
 * In the home page's slideshow every hero plays its opening shot each time it comes on show, not only the first one at page
 * load: a hero that is off show waits in "wait" (the same hidden look as "prep", but with nothing pending and nothing kept
 * ready on the graphics card), and plays when it is brought on.
 */
export function HeroIntro({
  patternUrl,
  template = 'split',
  seconds,
  instant = false,
  className,
  style,
  children,
}: {
  /** The pattern is a CSS background, so nothing waits for it unless we do it here. */
  patternUrl?: string;
  /** The layout, which decides where the camera's centre is (see `data-hero` in globals.css). */
  template?: string;
  /** How long the move takes, in seconds. Unset, the stylesheet's 4.4. */
  seconds?: number;
  /** Skip the opening shot: for the admin's preview, which is redrawn on every edit. */
  instant?: boolean;
  className?: string;
  /** More inline style for the frame (the height limit's variables). */
  style?: React.CSSProperties;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const ready = useAssetsReady(ref, patternUrl ? [patternUrl] : []);
  const slide = useHeroSlide();
  const active = slide?.active ?? true;

  // Off show, the hero is put back to "wait", but only once it has faded out: until then it keeps what it had.
  const [linger, setLinger] = useState(active);
  useEffect(() => {
    if (active) {
      setLinger(true);
      return;
    }
    const t = window.setTimeout(() => setLinger(false), LINGER_MS);
    return () => window.clearTimeout(t);
  }, [active]);

  const on = active || linger;
  const playing = on && (ready || instant);
  const state = !on ? 'wait' : playing ? 'play' : 'prep';

  // Tell the slideshow when this hero's shot starts, so its countdown runs from here.
  const report = slide?.reportPlay;
  const index = slide?.index ?? 0;
  useEffect(() => {
    if (active && playing) report?.(index);
  }, [active, playing, report, index]);

  // Once the move is over, the layers stop being kept ready for it (see `data-settled` in globals.css): a phone held as its
  // own graphics layer for as long as the page is open is memory a small phone can ill afford.
  const [settled, setSettled] = useState(false);
  useEffect(() => {
    if (!playing) {
      setSettled(false);
      return;
    }
    if (instant) {
      setSettled(true);
      return;
    }
    const t = window.setTimeout(() => setSettled(true), ((seconds ?? 4.4) + 1.5) * 1000);
    return () => window.clearTimeout(t);
  }, [playing, instant, seconds]);

  return (
    <div
      ref={ref}
      data-intro={state}
      data-settled={settled || undefined}
      data-hero={template}
      data-spotlight-host
      className={className}
      style={seconds || style ? ({ ...(seconds ? { '--intro-dur': `${seconds}s` } : {}), ...style } as React.CSSProperties) : undefined}
    >
      {children}
    </div>
  );
}
