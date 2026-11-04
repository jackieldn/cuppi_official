import { useEffect, type RefObject } from 'react';

const DURATION_MS = 700;
// The last one to leave starts this long after the first, so the cards set off one
// after another rather than all at once.
const SPREAD_MS = 650;
// Slight overshoot-free ease-out, the same family as the Works page's reorder glide.
const EASING = 'cubic-bezier(0.33, 1, 0.68, 1)';

const columnCount = (grid: HTMLElement) =>
  getComputedStyle(grid).gridTemplateColumns.split(' ').filter(Boolean).length;

/**
 * When a CSS grid's column count changes (the window shrinks or grows past a
 * breakpoint) its items jump to their new cells. This makes each one travel from where
 * it was to where it now belongs instead, starting in a random order with a small delay
 * between them, so the shuffle looks organic rather than a single synchronised slide.
 *
 * Needs the grid to be a positioned element (`relative`): item positions are read from
 * offsetLeft/offsetTop, which ignore transforms, so a glide already under way never
 * corrupts the layout it started from. Respects prefers-reduced-motion.
 */
export function useReflowShuffle(gridRef: RefObject<HTMLElement | null>, active: boolean) {
  useEffect(() => {
    const grid = gridRef.current;
    if (!grid || !active || typeof ResizeObserver === 'undefined') return;

    type Box = { left: number; top: number; width: number; height: number };
    let columns = columnCount(grid);
    let layout = new Map<HTMLElement, Box>();
    const gliding = new Map<HTMLElement, Animation>();

    const readLayout = () => {
      const next = new Map<HTMLElement, Box>();
      (Array.from(grid.children) as HTMLElement[]).forEach((el) =>
        next.set(el, { left: el.offsetLeft, top: el.offsetTop, width: el.offsetWidth, height: el.offsetHeight })
      );
      return next;
    };
    layout = readLayout();

    const shuffle = (previous: Map<HTMLElement, Box>) => {
      const gridRect = grid.getBoundingClientRect();
      const moves: { el: HTMLElement; dx: number; dy: number; sx: number; sy: number }[] = [];

      (Array.from(grid.children) as HTMLElement[]).forEach((el) => {
        const to = el.offsetWidth > 0 ? { left: el.offsetLeft, top: el.offsetTop, width: el.offsetWidth, height: el.offsetHeight } : null;
        if (!to) return;
        // A card still mid-glide starts from where it visibly is; the rest from where
        // the layout last had them.
        let from: Box | undefined = previous.get(el);
        if (gliding.has(el)) {
          const r = el.getBoundingClientRect();
          from = { left: r.left - gridRect.left, top: r.top - gridRect.top, width: r.width, height: r.height };
        }
        if (!from) return;
        const dx = from.left - to.left;
        const dy = from.top - to.top;
        const sx = from.width / to.width;
        const sy = from.height / to.height;
        if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5 && Math.abs(sx - 1) < 0.01 && Math.abs(sy - 1) < 0.01) return;
        moves.push({ el, dx, dy, sx, sy });
      });

      // Stop the old glides only now that every start position has been read.
      gliding.forEach((animation) => animation.cancel());
      gliding.clear();

      // A random leaving order, spread evenly over SPREAD_MS (with a little jitter so it
      // isn't a metronome).
      const order = moves.map((_, i) => i).sort(() => Math.random() - 0.5);
      moves.forEach(({ el, dx, dy, sx, sy }, i) => {
        const rank = order.indexOf(i);
        const delay = (moves.length > 1 ? (rank / (moves.length - 1)) * SPREAD_MS : 0) + Math.random() * 60;
        const animation = el.animate(
          [
            { transformOrigin: '0 0', transform: `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})` },
            { transformOrigin: '0 0', transform: 'none' },
          ],
          // 'backwards' holds the card at its old place until its turn comes.
          { duration: DURATION_MS, delay, easing: EASING, fill: 'backwards' }
        );
        gliding.set(el, animation);
        animation.onfinish = animation.oncancel = () => {
          if (gliding.get(el) === animation) gliding.delete(el);
        };
      });
    };

    const observer = new ResizeObserver(() => {
      const nextColumns = columnCount(grid);
      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (nextColumns !== columns && !reduceMotion) shuffle(layout);
      columns = nextColumns;
      layout = readLayout();
    });
    observer.observe(grid);

    return () => {
      observer.disconnect();
      gliding.forEach((animation) => animation.cancel());
    };
  }, [gridRef, active]);
}
