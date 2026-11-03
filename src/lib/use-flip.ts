import { useCallback, useEffect, useLayoutEffect, useRef, type RefObject } from 'react';

// useLayoutEffect warns when rendered on the server; fall back to useEffect there.
export const useIsomorphicLayoutEffect =
  typeof window === 'undefined' ? useEffect : useLayoutEffect;

const DURATION_MS = 500;
const EASING = 'cubic-bezier(0.33, 1, 0.68, 1)';

/**
 * FLIP animation for reflowing content: elements marked `data-flip` inside the
 * container glide from where they were to where they end up, instead of jumping.
 *
 *   data-flip="move"   translates only (blocks)
 *   data-flip="scale"  translates and scales (words, when the font size changes too)
 *
 * Call `measure()` synchronously BEFORE the state change that reflows the content,
 * then `play()` from a layout effect right after it. Both reads happen in the same
 * frame, so movement the container makes on its own (e.g. being pushed along by a
 * transition) isn't counted as reflow.
 */
export function useFlip(containerRef: RefObject<HTMLElement | null>) {
  const before = useRef<Map<HTMLElement, DOMRect>>(new Map());
  // Only the glides started here are ever cancelled: other animations on the same
  // element (a card's fade-up, say) must be left alone.
  const gliding = useRef<WeakMap<HTMLElement, Animation>>(new WeakMap());

  const measure = useCallback(() => {
    const next = new Map<HTMLElement, DOMRect>();
    containerRef.current
      ?.querySelectorAll<HTMLElement>('[data-flip]')
      .forEach((el) => next.set(el, el.getBoundingClientRect()));
    before.current = next;
  }, [containerRef]);

  const play = useCallback(() => {
    const container = containerRef.current;
    const prev = before.current;
    before.current = new Map();
    if (!container || prev.size === 0) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const els = Array.from(container.querySelectorAll<HTMLElement>('[data-flip]'));
    // Stop anything still gliding so the "after" positions below are the real ones.
    // (The "before" rects already include any in-flight transform.)
    els.forEach((el) => gliding.current.get(el)?.cancel());

    els.forEach((el) => {
      const from = prev.get(el);
      if (!from) return;
      const to = el.getBoundingClientRect();
      const dx = from.left - to.left;
      const dy = from.top - to.top;
      const scales = el.dataset.flip === 'scale' && to.width > 0 && to.height > 0;
      const sx = scales ? from.width / to.width : 1;
      const sy = scales ? from.height / to.height : 1;
      if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5 && Math.abs(sx - 1) < 0.01 && Math.abs(sy - 1) < 0.01) {
        return;
      }
      const glide = el.animate(
        [
          { transformOrigin: '0 0', transform: `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})` },
          { transformOrigin: '0 0', transform: 'none' },
        ],
        { duration: DURATION_MS, easing: EASING }
      );
      gliding.current.set(el, glide);
    });
  }, [containerRef]);

  return { measure, play };
}
