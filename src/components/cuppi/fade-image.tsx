'use client';

import Image from 'next/image';
import { useCallback, useEffect, useRef, useState, type ComponentProps } from 'react';

type Phase = 'pending' | 'in' | 'done';

/**
 * A next/image that stays unseen until it has downloaded, then fades up with a soft diagonal wipe from the
 * top-left corner to the bottom-right (`.img-fade` in globals.css), instead of appearing a row at a time.
 *
 * It is a drop-in for next/image (same props), plus `instant` for pictures that sit in something hidden (a closed menu) and
 * must be there the moment it opens, with no wipe. Three things keep it from ever leaving a picture hidden:
 *  - a picture that finished downloading before React took over is noticed on mount (`complete`);
 *  - one that fails to load is shown anyway, so a broken-image icon is not hidden;
 *  - the hiding is a CSS rule that only applies when scripting is on and motion is allowed, so no-JS and
 *    reduced-motion visitors just see the picture.
 * The wipe is a CSS mask, which is dropped once it ends so it costs nothing afterwards. While it runs, though, the mask is nine times
 * the picture's area, so `soft` swaps it for a plain fade: for big pictures (the phone renders), which a phone's memory cannot afford a mask on.
 */
export function FadeImage({ className, onLoad, onError, instant, soft, ...props }: ComponentProps<typeof Image> & { instant?: boolean; soft?: boolean }) {
  const [phase, setPhase] = useState<Phase>(instant ? 'done' : 'pending');
  const ref = useRef<HTMLImageElement | null>(null);

  const reveal = useCallback(() => setPhase((p) => (p === 'pending' ? 'in' : p)), []);

  // The browser may have finished the download before hydration, in which case onLoad never fires.
  useEffect(() => {
    const img = ref.current;
    if (img?.complete && img.naturalWidth > 0) reveal();
  }, [reveal]);

  return (
    <Image
      {...props}
      ref={ref}
      className={className ? `img-fade ${className}` : 'img-fade'}
      data-fade={phase}
      data-soft={soft || undefined}
      onAnimationEnd={(e) => {
        if (e.target === e.currentTarget) setPhase('done');
      }}
      onLoad={(e) => {
        reveal();
        onLoad?.(e);
      }}
      onError={(e) => {
        reveal();
        onError?.(e);
      }}
    />
  );
}
