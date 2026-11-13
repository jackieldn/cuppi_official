'use client';

import { useRef } from 'react';
import { useAssetsReady } from '@/lib/use-assets-ready';

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
 */
export function HeroIntro({
  patternUrl,
  template = 'split',
  seconds,
  instant = false,
  className,
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
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const ready = useAssetsReady(ref, patternUrl ? [patternUrl] : []);
  const state = ready || instant ? 'play' : 'prep';

  return (
    <div ref={ref} data-intro={state} data-hero={template} data-spotlight-host className={className} style={seconds ? ({ '--intro-dur': `${seconds}s` } as React.CSSProperties) : undefined}>
      {children}
    </div>
  );
}
