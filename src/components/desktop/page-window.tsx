'use client';

// Wraps the current page. In full-screen mode it adds nothing but the traffic
// lights. In window mode the page becomes a draggable, resizable window over
// the desktop wallpaper. The page stays mounted the whole time, so switching
// modes never reloads it or loses its state.

import { useLayoutEffect, useRef, useState, type CSSProperties, type PointerEvent, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';

import { cn } from '@/lib/utils';
import { findDockItem } from '@/components/layout/dock-items';
import {
  MENU_BAR_HEIGHT,
  MIN_H,
  MIN_W,
  TITLE_BAR_HEIGHT,
  ZOOM_MS,
  clampRect,
  useDesktop,
  type Rect,
} from './desktop-context';
import { DesktopApps } from './apps';
import { DesktopSurface } from './desktop-surface';
import { DosScreen } from './dos/dos-screen';
import { MenuBar } from './menu-bar';
import { TrafficLights } from './traffic-lights';

type Edge = { n?: boolean; s?: boolean; e?: boolean; w?: boolean };

const RESIZE_HANDLES: { edge: Edge; className: string; cursor: string }[] = [
  { edge: { n: true }, className: 'inset-x-3 -top-1.5 h-3', cursor: 'ns-resize' },
  { edge: { s: true }, className: 'inset-x-3 -bottom-1.5 h-3', cursor: 'ns-resize' },
  { edge: { e: true }, className: 'inset-y-3 -right-1.5 w-3', cursor: 'ew-resize' },
  { edge: { w: true }, className: 'inset-y-3 -left-1.5 w-3', cursor: 'ew-resize' },
  { edge: { n: true, w: true }, className: '-left-1.5 -top-1.5 size-4', cursor: 'nwse-resize' },
  { edge: { n: true, e: true }, className: '-right-1.5 -top-1.5 size-4', cursor: 'nesw-resize' },
  { edge: { s: true, w: true }, className: '-bottom-1.5 -left-1.5 size-4', cursor: 'nesw-resize' },
  { edge: { s: true, e: true }, className: '-bottom-1.5 -right-1.5 size-4', cursor: 'nwse-resize' },
];

const MINIMISE_MS = 500;
const CLOSE_MS = 180;

// Where the window shrinks to when minimised: the end of the Dock, where its
// minimised tile appears.
function minimiseTransform(r: Rect): string {
  const dock = document.querySelector('[aria-label="Main Navigation"]')?.getBoundingClientRect();
  const tx = dock ? dock.right + 20 : window.innerWidth / 2;
  const ty = dock ? dock.top + dock.height / 2 : window.innerHeight - 50;
  const dx = tx - (r.x + r.w / 2);
  const dy = ty - (r.y + r.h / 2);
  return `translate(${dx}px, ${dy}px) scale(0.06)`;
}

export function PageWindow({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const desktop = useDesktop();
  const { mode, windowState, rect, zooming, flush, scrollerRef, pendingScrollRef } = desktop;
  // Dragging or resizing: no transitions, and the page ignores the pointer
  // (iframes would otherwise swallow the drag).
  const [interacting, setInteracting] = useState(false);
  // While dragging or resizing, the window is moved by writing straight to
  // the element; React only hears about the final rect when the mouse is let
  // go. Going through React state on every mouse move made the window lag.
  const frameRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    startX: number;
    startY: number;
    start: Rect;
    edge: Edge | 'move';
    latest: Rect;
    /** The transition switched off for the drag, put back by hand when it ends. */
    transition: string;
  } | null>(null);

  // Carry the scroll position across the switch between window scroll (full
  // screen) and the window's own scroller.
  useLayoutEffect(() => {
    const top = pendingScrollRef.current;
    if (top === null) return;
    pendingScrollRef.current = null;
    if (mode === 'window') {
      if (scrollerRef.current) scrollerRef.current.scrollTop = top;
    } else {
      window.scrollTo({ top, behavior: 'instant' });
    }
  }, [mode, pendingScrollRef, scrollerRef]);

  // A new page in the window starts at its top, as it would full screen.
  const prevPathRef = useRef(pathname);
  useLayoutEffect(() => {
    if (prevPathRef.current === pathname) return;
    prevPathRef.current = pathname;
    if (mode === 'window' && scrollerRef.current) scrollerRef.current.scrollTop = 0;
  }, [pathname, mode, scrollerRef]);

  // The admin dashboard is not part of the desktop.
  if (pathname.startsWith('/admin')) return <>{children}</>;

  const isWindow = mode === 'window';
  const title = findDockItem(pathname)?.label ?? 'Jack';

  const beginPointer = (e: PointerEvent, edge: Edge | 'move') => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    const el = frameRef.current;
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      start: rect,
      edge,
      latest: rect,
      transition: el?.style.transition ?? '',
    };
    // No transitions from the very first move, before React re-renders.
    if (el) {
      el.style.transition = 'none';
      if (edge === 'move') el.style.willChange = 'transform';
    }
    setInteracting(true);
  };

  const movePointer = (e: PointerEvent) => {
    const drag = dragRef.current;
    if (!drag) return;
    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;
    const s = drag.start;
    const el = frameRef.current;
    if (drag.edge === 'move') {
      // Moving: slide the already-drawn window on the GPU.
      const next = clampRect({ ...s, x: s.x + dx, y: s.y + dy });
      drag.latest = next;
      if (el) el.style.transform = `translate3d(${next.x - s.x}px, ${next.y - s.y}px, 0)`;
      return;
    }
    const { n, s: south, e: east, w } = drag.edge;
    let { x, y, w: width, h: height } = s;
    if (east) width = Math.max(MIN_W, s.w + dx);
    if (south) height = Math.max(MIN_H, s.h + dy);
    if (w) {
      width = Math.max(MIN_W, s.w - dx);
      x = s.x + s.w - width;
    }
    if (n) {
      const top = Math.max(MENU_BAR_HEIGHT, s.y + dy);
      height = Math.max(MIN_H, s.y + s.h - top);
      y = s.y + s.h - height;
    }
    // Resizing has to lay the page out again, but still skips React.
    drag.latest = { x, y, w: width, h: height };
    if (el) {
      el.style.left = `${x}px`;
      el.style.top = `${y}px`;
      el.style.width = `${width}px`;
      el.style.height = `${height}px`;
    }
  };

  const endPointer = () => {
    const drag = dragRef.current;
    dragRef.current = null;
    if (!drag) return;
    const { latest } = drag;
    // Swap the drag transform for the final position in the same frame, so
    // nothing jumps, then hand the rect to React.
    const el = frameRef.current;
    if (el) {
      el.style.left = `${latest.x}px`;
      el.style.top = `${latest.y}px`;
      el.style.width = `${latest.w}px`;
      el.style.height = `${latest.h}px`;
      el.style.transform = 'none';
      el.style.willChange = '';
      // React may not have re-rendered since mouse-down (a quick click), in
      // which case it wouldn't know to put this back itself. Apply the final
      // position first (reading offsetWidth forces it), or the cleared drag
      // transform would animate back.
      void el.offsetWidth;
      el.style.transition = drag.transition;
    }
    desktop.setRect(latest);
    setInteracting(false);
  };

  let frameStyle: CSSProperties | undefined;
  if (isWindow) {
    const hidden = windowState !== 'open';
    const ms = windowState === 'closed' ? CLOSE_MS : MINIMISE_MS;
    const transitions = [
      `transform ${ms}ms cubic-bezier(0.4, 0, 0.2, 1)`,
      `opacity ${ms}ms ease`,
      // Hide only once the shrink has played; show straight away.
      `visibility 0s linear ${hidden ? ms : 0}ms`,
    ];
    if (zooming) {
      const ease = `${ZOOM_MS}ms cubic-bezier(0.32, 0.72, 0, 1)`;
      transitions.push(`left ${ease}`, `top ${ease}`, `width ${ease}`, `height ${ease}`, `border-radius ${ease}`);
    }
    frameStyle = {
      left: rect.x,
      top: rect.y,
      width: rect.w,
      height: rect.h,
      transition: interacting ? 'none' : transitions.join(', '),
      transform:
        windowState === 'minimised'
          ? minimiseTransform(rect)
          : windowState === 'closed'
            ? 'scale(0.94)'
            : 'none',
      opacity: hidden ? 0 : 1,
      visibility: hidden ? 'hidden' : 'visible',
      pointerEvents: hidden ? 'none' : undefined,
      // Covering the whole screen (or on its way there): in front of every app.
      zIndex: flush ? 39 : desktop.zIndexFor('page'),
    };
  }

  return (
    <>
      {isWindow && <DesktopSurface />}
      {/* Slides away while the window covers the whole screen, like macOS full screen. */}
      {isWindow && <MenuBar visible={!flush || windowState !== 'open'} />}

      {/*
        Full screen: the traffic lights float in the corner, and grow under the
        cursor so they're easy to hit. Not on phones or tablets.
      */}
      {!isWindow && desktop.available && (
        <div className="fixed left-4 top-4 z-40 origin-top-left rounded-full border border-palette-lagoon/40 bg-palette-ink/40 px-2.5 py-2 backdrop-blur-md transition-transform duration-200 ease-out hover:scale-[1.6] focus-within:scale-[1.6]">
          <TrafficLights fullScreen onClose={desktop.close} onMinimise={desktop.minimise} onZoom={desktop.toggleZoom} />
        </div>
      )}

      {/* Outer layer: position and animation. The resize grips hang off its edges. */}
      <div
        ref={frameRef}
        className={cn(isWindow && 'fixed')}
        style={frameStyle}
        onPointerDownCapture={isWindow ? () => desktop.focus('page') : undefined}
        role={isWindow ? 'dialog' : undefined}
        aria-label={isWindow ? title : undefined}
      >
        {/* Inner layer: the window's look, clipped to its rounded corners. */}
        <div
          className={cn(
            isWindow &&
              'flex h-full flex-col overflow-hidden border border-palette-lagoon/40 bg-background shadow-[0_24px_80px_-12px_rgba(0,0,0,0.65)]',
          )}
          style={isWindow ? { borderRadius: flush ? 0 : 12, transition: frameStyle?.transition } : undefined}
        >
        {isWindow && (
          <div
            className="relative flex shrink-0 cursor-default select-none items-center border-b border-palette-lagoon/25 bg-palette-ink/90 px-3"
            style={{ height: TITLE_BAR_HEIGHT }}
            onPointerDown={(e) => beginPointer(e, 'move')}
            onPointerMove={movePointer}
            onPointerUp={endPointer}
            onPointerCancel={endPointer}
            onDoubleClick={desktop.toggleZoom}
          >
            <TrafficLights onClose={desktop.close} onMinimise={desktop.minimise} onZoom={desktop.toggleZoom} />
            <span className="pointer-events-none absolute inset-x-24 truncate text-center text-[13px] font-medium text-foreground/80">
              {title}
            </span>
          </div>
        )}

        {/*
          Two layers so fixed-position parts of the page (like a floating
          sidebar) pin to the window instead of the screen: `contain` makes the
          outer layer their containing block, and it doesn't scroll.
        */}
        <div
          className={cn(isWindow && 'relative min-h-0 flex-1 [contain:layout_paint]', interacting && 'pointer-events-none select-none')}
        >
          <div ref={scrollerRef} className={cn(isWindow && 'h-full overflow-y-auto overflow-x-hidden overscroll-contain')}>
            {children}
          </div>
        </div>
        </div>

        {isWindow &&
          !flush &&
          RESIZE_HANDLES.map(({ edge, className, cursor }) => (
            <div
              key={className}
              aria-hidden="true"
              className={cn('absolute z-10', className)}
              style={{ cursor }}
              onPointerDown={(e) => beginPointer(e, edge)}
              onPointerMove={movePointer}
              onPointerUp={endPointer}
              onPointerCancel={endPointer}
            />
          ))}
      </div>

      {/* App windows only exist on the desktop; they come back when it does. */}
      {isWindow && <DesktopApps />}

      {/* The Time Machine's July 1997: JackDOS covers everything, the Dock included. */}
      {isWindow && desktop.era === '1997' && <DosScreen />}
    </>
  );
}
