'use client';

// App and folder icons on the desktop. By default they line up down the
// right-hand side, top to bottom, and carry on in the next column along when
// the column is full. Drag one anywhere and it stays there (remembered in this
// browser). Click selects, double-click (or Enter) opens, like macOS.

import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react';

import { cn } from '@/lib/utils';
import { DESKTOP_ICONS } from './apps';
import { MENU_BAR_HEIGHT, useDesktop } from './desktop-context';
import { clampGroupDelta, isAdditive } from './marquee-select';

const CELL_W = 88;
const CELL_H = 104;
const EDGE = 16;
// Past this many pixels a press becomes a drag rather than a click.
const DRAG_THRESHOLD = 4;
const POSITIONS_KEY = 'desktop-icon-positions';

// Room left for the Dock underneath, as the windows assume too.
const DOCK_ROOM = 110;

type Point = { x: number; y: number };
type Positions = Record<string, Point>;

/** Down the right-hand edge, then on into the next column to the left. */
function defaultPosition(index: number): Point {
  const perColumn = Math.max(1, Math.floor((window.innerHeight - MENU_BAR_HEIGHT - EDGE - DOCK_ROOM) / CELL_H));
  const column = Math.floor(index / perColumn);
  return {
    x: window.innerWidth - EDGE - CELL_W - column * CELL_W,
    y: MENU_BAR_HEIGHT + EDGE + (index % perColumn) * CELL_H,
  };
}

// Icons stay fully on screen, below the menu bar, even after the browser shrinks.
function clampPoint(p: Point): Point {
  return {
    x: Math.min(Math.max(p.x, 0), window.innerWidth - CELL_W),
    y: Math.min(Math.max(p.y, MENU_BAR_HEIGHT), window.innerHeight - CELL_H),
  };
}

function loadPositions(): Positions {
  try {
    const raw = localStorage.getItem(POSITIONS_KEY);
    return raw ? (JSON.parse(raw) as Positions) : {};
  } catch {
    return {};
  }
}

function savePositions(p: Positions) {
  try {
    localStorage.setItem(POSITIONS_KEY, JSON.stringify(p));
  } catch {
    // Not remembered, but still placed for this visit.
  }
}

interface DesktopIconsProps {
  selected: string[];
  onSelect: (ids: string[]) => void;
}

/** Everything being dragged: where each icon started, and where the pointer did. */
interface GroupDrag {
  startX: number;
  startY: number;
  moved: boolean;
  /** The icon that was pressed, which is the one a plain click collapses the selection to. */
  pressed: string;
  origins: Map<string, Point>;
  delta: Point;
}

/** One icon on the desktop: an app or a folder. */
interface Entry {
  /** Also the key its position is remembered under. */
  id: string;
  label: string;
  art: ReactNode;
  open: () => void;
}

export function DesktopIcons({ selected, onSelect }: DesktopIconsProps) {
  const { openApp } = useDesktop();
  const [positions, setPositions] = useState<Positions>({});
  // Re-render on resize so default and clamped positions follow the screen.
  const [, setViewport] = useState(0);

  useEffect(() => {
    setPositions(loadPositions());
    const onResize = () => setViewport((n) => n + 1);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // The apps and the folders. The videos themselves live inside the folders.
  const entries: Entry[] = DESKTOP_ICONS.map(({ id, label, Icon }) => ({
    id,
    label,
    art: <Icon />,
    open: () => openApp(id),
  }));

  const positionOf = (id: string): Point => {
    const index = entries.findIndex((entry) => entry.id === id);
    return clampPoint(positions[id] ?? defaultPosition(Math.max(0, index)));
  };

  const place = (moved: Positions) => {
    setPositions((prev) => {
      const next = { ...prev, ...moved };
      savePositions(next);
      return next;
    });
  };

  // The icons on screen, so a drag can move them directly.
  const elements = useRef(new Map<string, HTMLButtonElement>());
  const dragRef = useRef<GroupDrag | null>(null);

  const onPointerDown = (e: PointerEvent<HTMLButtonElement>, id: string) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    const isSelected = selected.includes(id);

    if (isAdditive(e)) {
      // Ctrl/Cmd/Shift-click adds an icon to the selection, or takes it back out.
      onSelect(isSelected ? selected.filter((s) => s !== id) : [...selected, id]);
      if (isSelected) return;
    } else if (!isSelected) {
      onSelect([id]);
    }

    // Pressing one of several selected icons drags them all.
    const moving = isAdditive(e) || isSelected ? [...new Set([...selected, id])] : [id];
    const origins = new Map(moving.map((m) => [m, positionOf(m)] as const));
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { startX: e.clientX, startY: e.clientY, moved: false, pressed: id, origins, delta: { x: 0, y: 0 } };
  };

  // Like the windows: move the elements directly while dragging, no React render per move.
  const onPointerMove = (e: PointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    // The button was let go somewhere we never heard about: drop them, don't keep carrying them.
    if (e.buttons === 0) return onPointerUp();
    const rawX = e.clientX - drag.startX;
    const rawY = e.clientY - drag.startY;
    if (!drag.moved && Math.hypot(rawX, rawY) < DRAG_THRESHOLD) return;
    drag.moved = true;
    // Slid back as one, so the group keeps its shape against the screen edge.
    const { dx, dy } = clampGroupDelta(
      [...drag.origins.values()],
      window.innerWidth - CELL_W,
      window.innerHeight - CELL_H,
      MENU_BAR_HEIGHT,
      rawX,
      rawY,
    );
    drag.delta = { x: dx, y: dy };
    for (const id of drag.origins.keys()) {
      const el = elements.current.get(id);
      if (!el) continue;
      el.style.transform = `translate3d(${dx}px, ${dy}px, 0)`;
      el.style.zIndex = '2';
    }
  };

  const onPointerUp = () => {
    const drag = dragRef.current;
    dragRef.current = null;
    if (!drag) return;
    if (!drag.moved) {
      // A plain click on one of several selected icons picks just that one.
      if (drag.origins.size > 1) onSelect([drag.pressed]);
      return;
    }
    const moved: Positions = {};
    for (const [id, from] of drag.origins) {
      const to = { x: from.x + drag.delta.x, y: from.y + drag.delta.y };
      moved[id] = to;
      const el = elements.current.get(id);
      if (el) {
        // Swap the drag transform for the saved position in the same frame.
        el.style.left = `${to.x}px`;
        el.style.top = `${to.y}px`;
        el.style.transform = '';
        el.style.zIndex = '';
      }
    }
    place(moved);
  };

  return (
    <>
      {entries.map((entry, index) => (
        <DesktopIcon
          key={entry.id}
          id={entry.id}
          label={entry.label}
          art={entry.art}
          position={clampPoint(positions[entry.id] ?? defaultPosition(index))}
          selected={selected.includes(entry.id)}
          registerEl={(el) => {
            if (el) elements.current.set(entry.id, el);
            else elements.current.delete(entry.id);
          }}
          onOpen={() => {
            onSelect([]);
            entry.open();
          }}
          onPointerDown={(e) => onPointerDown(e, entry.id)}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
        />
      ))}
    </>
  );
}

interface DesktopIconProps {
  id: string;
  label: string;
  art: ReactNode;
  position: Point;
  selected: boolean;
  registerEl: (el: HTMLButtonElement | null) => void;
  onOpen: () => void;
  onPointerDown: (e: PointerEvent<HTMLButtonElement>) => void;
  onPointerMove: (e: PointerEvent<HTMLButtonElement>) => void;
  onPointerUp: () => void;
}

function DesktopIcon({
  id,
  label,
  art,
  position,
  selected,
  registerEl,
  onOpen,
  onPointerDown,
  onPointerMove,
  onPointerUp,
}: DesktopIconProps) {
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter') onOpen();
  };

  return (
    <button
      ref={registerEl}
      type="button"
      data-desktop-icon={id}
      aria-label={`Open ${label}`}
      // Only the picture and the name grab a press: the empty space around them
      // passes it on to the desktop, where it starts a selection rectangle.
      className="group pointer-events-none absolute flex cursor-default select-none flex-col items-center gap-1 rounded-lg p-1.5 outline-none [touch-action:none] focus-visible:ring-2 focus-visible:ring-ring"
      style={{ left: position.x, top: position.y, width: CELL_W }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onDoubleClick={onOpen}
      onKeyDown={onKeyDown}
    >
      <span
        className={cn(
          'pointer-events-auto relative rounded-[14px] p-1 transition-colors',
          selected ? 'bg-palette-ink/55 ring-2 ring-palette-cream/60' : 'bg-transparent',
        )}
      >
        {art}
      </span>
      <span
        className={cn(
          'pointer-events-auto line-clamp-2 max-w-full break-words rounded px-1 text-center text-[12px] font-medium leading-5 text-palette-cream [text-shadow:0_1px_3px_rgba(0,0,0,0.8)]',
          selected && 'bg-primary [text-shadow:none]',
        )}
      >
        {label}
      </span>
    </button>
  );
}
