'use client';

// A small desktop app's window, like a macOS settings panel: fixed width,
// sized to its content, draggable by its title bar, and brought to the front
// when clicked. Only the red button works; the other two show greyed out.
//
// Dragging writes the position straight to the element as a transform, with
// no React render per mouse move, so the window keeps up with the cursor.

import { useLayoutEffect, useRef, useState, type PointerEvent, type ReactNode } from 'react';

import { cn } from '@/lib/utils';
import { MENU_BAR_HEIGHT, TITLE_BAR_HEIGHT, useDesktop, type AppId } from './desktop-context';
import { TrafficLights } from './traffic-lights';

const CLOSE_MS = 150;

interface AppWindowProps {
  id: AppId;
  title: string;
  width: number;
  children: ReactNode;
}

interface Point {
  x: number;
  y: number;
}

// Keep the title bar on screen and below the menu bar.
function clampPoint(p: Point, width: number): Point {
  return {
    x: Math.min(Math.max(p.x, 120 - width), window.innerWidth - 120),
    y: Math.min(Math.max(p.y, MENU_BAR_HEIGHT), window.innerHeight - TITLE_BAR_HEIGHT - 8),
  };
}

export function AppWindow({ id, title, width, children }: AppWindowProps) {
  const desktop = useDesktop();
  const frameRef = useRef<HTMLDivElement>(null);
  const posRef = useRef<Point>({ x: 0, y: 0 });
  const [placed, setPlaced] = useState(false);
  const [closing, setClosing] = useState(false);
  const dragRef = useRef<{ startX: number; startY: number; start: Point } | null>(null);

  const moveTo = (p: Point) => {
    posRef.current = p;
    if (frameRef.current) frameRef.current.style.transform = `translate3d(${p.x}px, ${p.y}px, 0)`;
  };

  // Open centred in the space between the menu bar and the Dock, a little high.
  useLayoutEffect(() => {
    const h = frameRef.current?.offsetHeight ?? 300;
    const free = window.innerHeight - MENU_BAR_HEIGHT - 110;
    moveTo(
      clampPoint(
        { x: Math.round((window.innerWidth - width) / 2), y: MENU_BAR_HEIGHT + Math.round((free - h) * 0.4) },
        width,
      ),
    );
    setPlaced(true);
  }, [width]);

  const close = () => {
    setClosing(true);
    setTimeout(() => desktop.closeApp(id), CLOSE_MS);
  };

  const onPointerDown = (e: PointerEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { startX: e.clientX, startY: e.clientY, start: posRef.current };
  };

  const onPointerMove = (e: PointerEvent) => {
    const drag = dragRef.current;
    if (!drag) return;
    moveTo(clampPoint({ x: drag.start.x + e.clientX - drag.startX, y: drag.start.y + e.clientY - drag.startY }, width));
  };

  const endDrag = () => {
    dragRef.current = null;
  };

  const active = desktop.frontmost === id;

  return (
    // Outer layer: position only, moved by transform on its own GPU layer.
    <div
      ref={frameRef}
      role="dialog"
      aria-label={title}
      className="fixed left-0 top-0 will-change-transform"
      style={{
        width,
        zIndex: desktop.zIndexFor(id),
        // Measured and placed before it's shown.
        visibility: placed ? 'visible' : 'hidden',
      }}
      onPointerDownCapture={() => desktop.focus(id)}
    >
      {/* Inner layer: the look, and the open and close animations (which also use transform). */}
      <div
        className={cn(
          'flex flex-col overflow-hidden rounded-xl border border-palette-lagoon/40 bg-background shadow-[0_24px_80px_-12px_rgba(0,0,0,0.65)]',
          closing ? 'animate-out fade-out zoom-out-95 fill-mode-forwards duration-150' : 'animate-in fade-in zoom-in-95 duration-200',
        )}
      >
        <div
          className="relative flex shrink-0 cursor-default select-none items-center px-3"
          style={{ height: TITLE_BAR_HEIGHT }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
        >
          <TrafficLights onClose={close} />
          <span
            className={cn(
              'pointer-events-none absolute inset-x-24 truncate text-center text-[13px] font-semibold transition-colors',
              active ? 'text-foreground/90' : 'text-foreground/45',
            )}
          >
            {title}
          </span>
        </div>
        {children}
      </div>
    </div>
  );
}
