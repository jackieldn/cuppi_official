'use client';

// App icons and video files on the desktop. By default they line up down the
// right-hand side, top to bottom, and carry on in the next column along when
// the column is full. Drag one anywhere and it stays there (remembered in this
// browser). Click selects, double-click (or Enter) opens, like macOS.

import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react';

import { cn } from '@/lib/utils';
import { videoSource } from '@/lib/desktop-video-source';
import { DESKTOP_ICONS } from './apps';
import { VideoFileIcon } from './apps/video-app';
import { MENU_BAR_HEIGHT, useDesktop } from './desktop-context';
import { useDesktopVideos } from './use-desktop-videos';

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
  selected: string | null;
  onSelect: (id: string | null) => void;
}

/** One icon on the desktop: an app, or a video file. */
interface Entry {
  /** Also the key its position is remembered under. */
  id: string;
  label: string;
  art: ReactNode;
  open: () => void;
}

export function DesktopIcons({ selected, onSelect }: DesktopIconsProps) {
  const { openApp, openVideo } = useDesktop();
  const { videos } = useDesktopVideos('2026');
  const [positions, setPositions] = useState<Positions>({});
  // Re-render on resize so default and clamped positions follow the screen.
  const [, setViewport] = useState(0);

  useEffect(() => {
    setPositions(loadPositions());
    const onResize = () => setViewport((n) => n + 1);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // The apps, then the videos tagged for 2026 as files (only ones the player can open).
  const entries: Entry[] = [
    ...DESKTOP_ICONS.map(({ id, label, Icon }) => ({ id, label, art: <Icon />, open: () => openApp(id) })),
    ...(videos ?? [])
      .filter((v) => videoSource(v.url))
      .map((v) => ({
        id: `video:${v.id}`,
        label: `${v.title}.mp4`,
        art: <VideoFileIcon video={v} />,
        open: () => openVideo(v.id),
      })),
  ];

  const place = (id: string, p: Point) => {
    setPositions((prev) => {
      const next = { ...prev, [id]: p };
      savePositions(next);
      return next;
    });
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
          selected={selected === entry.id}
          onSelect={() => onSelect(entry.id)}
          onOpen={() => {
            onSelect(null);
            entry.open();
          }}
          onPlace={(p) => place(entry.id, p)}
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
  onSelect: () => void;
  onOpen: () => void;
  onPlace: (p: Point) => void;
}

function DesktopIcon({ id, label, art, position, selected, onSelect, onOpen, onPlace }: DesktopIconProps) {
  const ref = useRef<HTMLButtonElement>(null);
  const dragRef = useRef<{ startX: number; startY: number; moved: boolean; latest: Point } | null>(null);

  const onPointerDown = (e: PointerEvent<HTMLButtonElement>) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { startX: e.clientX, startY: e.clientY, moved: false, latest: position };
    onSelect();
  };

  // Like the windows: move the element directly while dragging, no React render per move.
  const onPointerMove = (e: PointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;
    if (!drag.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
    drag.moved = true;
    drag.latest = clampPoint({ x: position.x + dx, y: position.y + dy });
    const el = ref.current;
    if (el) {
      el.style.transform = `translate3d(${drag.latest.x - position.x}px, ${drag.latest.y - position.y}px, 0)`;
      el.style.zIndex = '2';
    }
  };

  const onPointerUp = () => {
    const drag = dragRef.current;
    dragRef.current = null;
    if (!drag?.moved) return;
    const el = ref.current;
    if (el) {
      // Swap the drag transform for the saved position in the same frame.
      el.style.left = `${drag.latest.x}px`;
      el.style.top = `${drag.latest.y}px`;
      el.style.transform = '';
      el.style.zIndex = '';
    }
    onPlace(drag.latest);
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter') onOpen();
  };

  return (
    <button
      ref={ref}
      type="button"
      data-desktop-icon={id}
      aria-label={`Open ${label}`}
      className="group absolute flex cursor-default select-none flex-col items-center gap-1 rounded-lg p-1.5 outline-none [touch-action:none] focus-visible:ring-2 focus-visible:ring-ring"
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
          'relative rounded-[14px] p-1 transition-colors',
          selected ? 'bg-palette-ink/45 ring-1 ring-palette-cream/25' : 'bg-transparent',
        )}
      >
        {art}
      </span>
      <span
        className={cn(
          'line-clamp-2 max-w-full break-words rounded px-1 text-center text-[12px] font-medium leading-5 text-palette-cream [text-shadow:0_1px_3px_rgba(0,0,0,0.8)]',
          selected && 'bg-primary [text-shadow:none]',
        )}
      >
        {label}
      </span>
    </button>
  );
}
