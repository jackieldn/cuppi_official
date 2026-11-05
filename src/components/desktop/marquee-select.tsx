'use client';

// Rubber-band selection for the desktop icons, shared by the 2026 desktop and
// Poot XP: press on empty desktop, drag out a rectangle, and every icon it
// touches is selected. Hold Ctrl, Cmd or Shift to add to what is already
// selected instead of starting over.
//
// Icons are found in the page rather than from a list, so it works whichever
// way they are laid out: anything marked with data-desktop-icon counts.

import { useRef, useState, type CSSProperties, type PointerEvent } from 'react';

/** Pointer travel before a press on the desktop turns into a rectangle. */
const MARQUEE_THRESHOLD = 4;

/** The attribute that marks an icon, holding its id. */
export const ICON_ATTR = 'data-desktop-icon';

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** What an icon covers on screen: its children (picture and name) together, or the whole element if it has none. */
function iconRect(el: HTMLElement) {
  const parts = [...el.children].map((c) => c.getBoundingClientRect()).filter((r) => r.width > 0 && r.height > 0);
  if (!parts.length) return el.getBoundingClientRect();
  return {
    left: Math.min(...parts.map((r) => r.left)),
    right: Math.max(...parts.map((r) => r.right)),
    top: Math.min(...parts.map((r) => r.top)),
    bottom: Math.max(...parts.map((r) => r.bottom)),
  };
}

/** True when the key held with a click means "add to the selection". */
export function isAdditive(e: { ctrlKey: boolean; metaKey: boolean; shiftKey: boolean }) {
  return e.ctrlKey || e.metaKey || e.shiftKey;
}

/**
 * Slides a group's drag distance back so that no icon ends up off the desktop
 * and the group keeps its shape (the way a pile of files moves in Explorer).
 */
export function clampGroupDelta(
  points: { x: number; y: number }[],
  maxX: number,
  maxY: number,
  minY: number,
  dx: number,
  dy: number,
) {
  let loX = -Infinity;
  let hiX = Infinity;
  let loY = -Infinity;
  let hiY = Infinity;
  for (const p of points) {
    loX = Math.max(loX, 0 - p.x);
    hiX = Math.min(hiX, Math.max(0, maxX) - p.x);
    loY = Math.max(loY, minY - p.y);
    hiY = Math.min(hiY, Math.max(minY, maxY) - p.y);
  }
  if (!points.length) return { dx, dy };
  return {
    dx: Math.min(Math.max(dx, Math.min(loX, hiX)), Math.max(loX, hiX)),
    dy: Math.min(Math.max(dy, Math.min(loY, hiY)), Math.max(loY, hiY)),
  };
}

interface Options {
  /** The icons now inside the rectangle (plus any held over from before, when adding). */
  onSelect: (ids: string[]) => void;
  /** What was selected when the press began, for Ctrl/Cmd/Shift to build on. */
  current: string[];
}

interface Press {
  sx: number;
  sy: number;
  active: boolean;
  additive: boolean;
  base: string[];
  last: string;
}

/**
 * Spread `handlers` on the element that holds the icons (and `children`, the
 * <MarqueeBox>, inside it). Icons stop their own pointerdown, so a press that
 * gets here is on empty desktop.
 */
export function useMarquee({ onSelect, current }: Options) {
  const [box, setBox] = useState<Rect | null>(null);
  const press = useRef<Press | null>(null);

  const onPointerDown = (e: PointerEvent<HTMLElement>) => {
    if (e.button !== 0) return;
    const additive = isAdditive(e);
    press.current = { sx: e.clientX, sy: e.clientY, active: false, additive, base: additive ? current : [], last: '' };
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // The pointer is already gone; the rectangle just won't follow it off the desktop.
    }
  };

  const end = (e: PointerEvent<HTMLElement>) => {
    press.current = null;
    setBox(null);
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
  };

  const onPointerMove = (e: PointerEvent<HTMLElement>) => {
    const p = press.current;
    if (!p) return;
    // The button was let go somewhere we never heard about: stop, don't keep drawing.
    if (e.buttons === 0) return end(e);
    if (!p.active && Math.hypot(e.clientX - p.sx, e.clientY - p.sy) < MARQUEE_THRESHOLD) return;
    p.active = true;

    const host = e.currentTarget.getBoundingClientRect();
    // Stay inside the desktop even when the pointer leaves it.
    const cx = Math.min(Math.max(e.clientX, host.left), host.right);
    const cy = Math.min(Math.max(e.clientY, host.top), host.bottom);
    const sx = Math.min(Math.max(p.sx, host.left), host.right);
    const sy = Math.min(Math.max(p.sy, host.top), host.bottom);
    const left = Math.min(sx, cx);
    const top = Math.min(sy, cy);
    const right = Math.max(sx, cx);
    const bottom = Math.max(sy, cy);
    setBox({ x: left - host.left, y: top - host.top, w: right - left, h: bottom - top });

    const inside: string[] = [];
    e.currentTarget.querySelectorAll<HTMLElement>(`[${ICON_ATTR}]`).forEach((el) => {
      // An icon is its picture and its name; the empty margin around them doesn't count.
      const r = iconRect(el);
      if (r.left < right && r.right > left && r.top < bottom && r.bottom > top) {
        const id = el.getAttribute(ICON_ATTR);
        if (id) inside.push(id);
      }
    });
    const ids = p.additive ? [...p.base, ...inside.filter((id) => !p.base.includes(id))] : inside;
    const key = ids.join('\n');
    if (key !== p.last) {
      p.last = key;
      onSelect(ids);
    }
  };

  return {
    box,
    handlers: { onPointerDown, onPointerMove, onPointerUp: end, onPointerCancel: end },
  };
}

/** The rectangle itself. Give it the look of the desktop it is on. */
export function MarqueeBox({ box, className, style }: { box: Rect | null; className?: string; style?: CSSProperties }) {
  if (!box) return null;
  return (
    <div
      aria-hidden="true"
      className={className}
      style={{
        position: 'absolute',
        left: box.x,
        top: box.y,
        width: box.w,
        height: box.h,
        pointerEvents: 'none',
        ...style,
      }}
    />
  );
}
