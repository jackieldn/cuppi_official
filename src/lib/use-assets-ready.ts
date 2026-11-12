'use client';

import { useEffect, useState, type RefObject } from 'react';

/**
 * True once everything a block needs has downloaded: the page itself, the fonts, every
 * <img> inside `root`, and any extra pictures listed in `extraUrls` (a CSS background such
 * as a pattern is not an <img>, so nothing waits for it unless we do it here).
 * It never stays false: after 6 seconds it says yes anyway, and with reduced motion it is
 * true straight away, so whatever waits on it can never be left hidden.
 * Used by the home hero's opening shot and the icon fan on the support page.
 */
export function useAssetsReady(root: RefObject<HTMLElement | null>, extraUrls: string[] = []): boolean {
  const [ready, setReady] = useState(false);
  const key = extraUrls.join('|');

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setReady(true);
      return;
    }

    let cancelled = false;
    const done = () => {
      if (!cancelled) setReady(true);
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
      ...Array.from(el.querySelectorAll('img')).map(settle),
      ...(key ? key.split('|') : []).map(
        (url) =>
          new Promise<void>((resolve) => {
            const img = new Image();
            img.onload = img.onerror = () => resolve();
            img.src = url;
          }),
      ),
    ];

    // Two frames after the last download, so the waiting state has been painted before anything moves.
    Promise.all(waits).then(() => requestAnimationFrame(() => requestAnimationFrame(done)));
    const failsafe = window.setTimeout(done, 6000);
    return () => {
      cancelled = true;
      window.clearTimeout(failsafe);
    };
  }, [root, key]);

  return ready;
}
