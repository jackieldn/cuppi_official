'use client';

// A small desktop app's window, like a macOS settings panel: draggable by its
// title bar and brought to the front when clicked. By default it has a fixed
// width, is sized to its content, and only the red button works (the other two
// show greyed out).
//
// An app can opt in to more: give it a `height` and the window can be resized
// from its edges and corners; set `minimisable` and the yellow button shrinks
// it to the Dock, where a tile brings it back.
//
// Dragging and resizing write straight to the element, with no React render per
// mouse move, so the window keeps up with the cursor.

import { useLayoutEffect, useRef, useState, type CSSProperties, type PointerEvent, type ReactNode } from 'react';

import { cn } from '@/lib/utils';
import { MENU_BAR_HEIGHT, TITLE_BAR_HEIGHT, useDesktop, type AppId } from './desktop-context';
import { TrafficLights } from './traffic-lights';

const CLOSE_MS = 150;
const MINIMISE_MS = 500;

interface AppWindowProps {
  id: AppId;
  title: string;
  width: number;
  /** Start height. Giving one makes the window resizable; the children then fill the space under the title bar. */
  height?: number;
  minWidth?: number;
  minHeight?: number;
  /** The yellow button shrinks the window to the Dock. */
  minimisable?: boolean;
  children: ReactNode;
}

interface Point {
  x: number;
  y: number;
}

interface Size {
  w: number;
  h: number;
}

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

// Keep the title bar on screen and below the menu bar.
function clampPoint(p: Point, width: number): Point {
  return {
    x: Math.min(Math.max(p.x, 120 - width), window.innerWidth - 120),
    y: Math.min(Math.max(p.y, MENU_BAR_HEIGHT), window.innerHeight - TITLE_BAR_HEIGHT - 8),
  };
}

export function AppWindow({ id, title, width, height, minWidth = 420, minHeight = 280, minimisable, children }: AppWindowProps) {
  const desktop = useDesktop();
  const resizable = height !== undefined;
  const frameRef = useRef<HTMLDivElement>(null);
  const posRef = useRef<Point>({ x: 0, y: 0 });
  const sizeRef = useRef<Size>({ w: width, h: height ?? 0 });
  const [size, setSize] = useState<Size>({ w: width, h: height ?? 0 });
  const [placed, setPlaced] = useState(false);
  const [closing, setClosing] = useState(false);
  // Where the window shrinks to when minimised, worked out when the button is pressed.
  const [shrinkTo, setShrinkTo] = useState('');
  const dragRef = useRef<{ startX: number; startY: number; start: Point } | null>(null);
  const resizeRef = useRef<{ startX: number; startY: number; edge: Edge; pos: Point; size: Size } | null>(null);

  const minimised = desktop.minimisedApps.includes(id);

  const moveTo = (p: Point) => {
    posRef.current = p;
    if (frameRef.current) frameRef.current.style.transform = `translate3d(${p.x}px, ${p.y}px, 0)`;
  };

  // Open centred in the space between the menu bar and the Dock, a little high.
  useLayoutEffect(() => {
    const free = window.innerHeight - MENU_BAR_HEIGHT - 110;
    let w = width;
    let h = frameRef.current?.offsetHeight ?? 300;
    if (resizable) {
      // Never open bigger than the room there is.
      w = Math.min(width, window.innerWidth - 40);
      h = Math.min(height, free);
      sizeRef.current = { w, h };
      setSize({ w, h });
    }
    moveTo(
      clampPoint({ x: Math.round((window.innerWidth - w) / 2), y: MENU_BAR_HEIGHT + Math.round((free - h) * 0.4) }, w),
    );
    setPlaced(true);
    // Only when it first opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const close = () => {
    setClosing(true);
    setTimeout(() => desktop.closeApp(id), CLOSE_MS);
  };

  const minimise = () => {
    const frame = frameRef.current?.getBoundingClientRect();
    // The end of the Dock, where the minimised tile appears.
    const dock = document.querySelector('[aria-label="Main Navigation"]')?.getBoundingClientRect();
    if (frame) {
      const tx = dock ? dock.right + 20 : window.innerWidth / 2;
      const ty = dock ? dock.top + dock.height / 2 : window.innerHeight - 50;
      const dx = tx - (frame.left + frame.width / 2);
      const dy = ty - (frame.top + frame.height / 2);
      setShrinkTo(`translate(${dx}px, ${dy}px) scale(0.06)`);
    }
    desktop.minimiseApp(id);
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
    moveTo(
      clampPoint(
        { x: drag.start.x + e.clientX - drag.startX, y: drag.start.y + e.clientY - drag.startY },
        sizeRef.current.w,
      ),
    );
  };

  const endDrag = () => {
    dragRef.current = null;
  };

  const beginResize = (e: PointerEvent, edge: Edge) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    resizeRef.current = { startX: e.clientX, startY: e.clientY, edge, pos: posRef.current, size: sizeRef.current };
  };

  const moveResize = (e: PointerEvent) => {
    const r = resizeRef.current;
    if (!r) return;
    const dx = e.clientX - r.startX;
    const dy = e.clientY - r.startY;
    const maxW = window.innerWidth;
    const maxH = window.innerHeight - MENU_BAR_HEIGHT;
    let { x, y } = r.pos;
    let { w, h } = r.size;
    if (r.edge.e) w = Math.min(maxW, Math.max(minWidth, r.size.w + dx));
    if (r.edge.w) {
      w = Math.min(maxW, Math.max(minWidth, r.size.w - dx));
      x = r.pos.x + r.size.w - w;
    }
    if (r.edge.s) h = Math.min(maxH, Math.max(minHeight, r.size.h + dy));
    if (r.edge.n) {
      // The top edge can't go under the menu bar.
      const top = Math.max(MENU_BAR_HEIGHT, r.pos.y + dy);
      h = Math.min(maxH, Math.max(minHeight, r.pos.y + r.size.h - top));
      y = r.pos.y + r.size.h - h;
    }
    sizeRef.current = { w, h };
    const el = frameRef.current;
    if (el) {
      el.style.width = `${w}px`;
      el.style.height = `${h}px`;
    }
    moveTo({ x, y });
  };

  const endResize = () => {
    if (!resizeRef.current) return;
    resizeRef.current = null;
    // Hand the final size to React so the next render agrees with the element.
    setSize(sizeRef.current);
  };

  const active = desktop.frontmost === id;

  const innerStyle: CSSProperties | undefined = minimisable
    ? {
        transform: minimised ? shrinkTo : undefined,
        opacity: minimised ? 0 : undefined,
        transition: `transform ${MINIMISE_MS}ms cubic-bezier(0.4, 0, 0.2, 1), opacity ${MINIMISE_MS}ms ease`,
      }
    : undefined;

  return (
    // Outer layer: position only, moved by transform on its own GPU layer.
    <div
      ref={frameRef}
      role="dialog"
      aria-label={title}
      className="fixed left-0 top-0 will-change-transform"
      style={{
        width: size.w,
        height: resizable ? size.h : undefined,
        zIndex: desktop.zIndexFor(id),
        // Measured and placed before it's shown; hidden once the shrink to the Dock has played.
        visibility: placed && !minimised ? 'visible' : 'hidden',
        transition: `visibility 0s linear ${minimised ? MINIMISE_MS : 0}ms`,
        pointerEvents: minimised ? 'none' : undefined,
      }}
      onPointerDownCapture={() => desktop.focus(id)}
    >
      {/* Inner layer: the look, and the open and close animations (which also use transform). */}
      <div
        style={innerStyle}
        className={cn(
          'flex flex-col overflow-hidden rounded-xl border border-palette-lagoon/40 bg-background shadow-[0_24px_80px_-12px_rgba(0,0,0,0.65)]',
          resizable && 'h-full',
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
          <TrafficLights onClose={close} onMinimise={minimisable ? minimise : undefined} />
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

      {resizable &&
        RESIZE_HANDLES.map(({ edge, className, cursor }) => (
          <div
            key={className}
            aria-hidden="true"
            className={cn('absolute z-10', className)}
            style={{ cursor }}
            onPointerDown={(e) => beginResize(e, edge)}
            onPointerMove={moveResize}
            onPointerUp={endResize}
            onPointerCancel={endResize}
          />
        ))}
    </div>
  );
}
