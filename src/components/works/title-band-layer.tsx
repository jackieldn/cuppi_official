'use client';

import { useBand } from '@/lib/title-band';

export const BAND_FADE_MS = 1000;

/**
 * The lighter band behind a project's title and details (see src/lib/title-band.ts).
 * Sits behind the page content at the very top of the document and fades in and out
 * over BAND_FADE_MS, across page changes.
 */
export function TitleBandLayer() {
  const band = useBand();
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 top-0 -z-10 bg-card transition-opacity ease-in-out motion-reduce:transition-none"
      style={{
        height: band.height,
        opacity: band.on ? 1 : 0,
        transitionDuration: `${BAND_FADE_MS}ms`,
      }}
    />
  );
}
