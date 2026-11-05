'use client';

// The icons on the Poot XP desktop. They can be dragged and dropped anywhere,
// with no grid to snap to (and they can pile on top of each other, the way
// they did). Where you leave one is remembered.
//
// An icon you haven't moved starts wherever xp-icon-layout.ts put it: a couple
// of groups gathered into corners, the rest dropped here and there. It's a
// different mess each visit.

import { useEffect, useRef, useState, type PointerEvent, type ReactNode } from 'react';

import { cn } from '@/lib/utils';
import { TASKBAR_HEIGHT } from './xp-window';
import { clampPoint, createLayout, type Point } from './xp-icon-layout';
import styles from './xp.module.css';

export interface DesktopIconItem {
  id: string;
  label: string;
  icon: ReactNode;
  open: () => void;
  /** Things in the same group tend to end up in the same corner. */
  group?: string;
}

/** Pointer travel before a press turns into a drag, so a double-click stays a double-click. */
const DRAG_THRESHOLD = 4;
const STORAGE_KEY = 'xp-icon-pos';

function readSaved(): Record<string, Point> {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as Record<string, Point>;
    const clean: Record<string, Point> = {};
    for (const [id, p] of Object.entries(saved)) {
      if (Number.isFinite(p?.x) && Number.isFinite(p?.y)) clean[id] = { x: p.x, y: p.y };
    }
    return clean;
  } catch {
    return {};
  }
}

interface Props {
  items: DesktopIconItem[];
  selected: string | null;
  onSelect: (id: string) => void;
  /** The strip of the desktop (left and right edge, in pixels) that a window covers when the PC starts. */
  covered?: [number, number];
  /** The groups that can be gathered into a corner. */
  groups: string[];
}

export function DesktopIcons({ items, selected, onSelect, covered, groups }: Props) {
  const [saved, setSaved] = useState<Record<string, Point>>({});
  const [size, setSize] = useState(() => ({ w: window.innerWidth, h: window.innerHeight - TASKBAR_HEIGHT }));
  // The icon being dragged, and how far it has been taken from where it was.
  const [drag, setDrag] = useState<{ id: string; dx: number; dy: number } | null>(null);
  const press = useRef<{ id: string; sx: number; sy: number; active: boolean } | null>(null);
  // The icon last touched is on top, so a pile reads in the order it was made.
  const raised = useRef<Record<string, number>>({});
  const top = useRef(0);

  // One layout for the whole visit: icons that turn up late (pictures and
  // posts load while the PC boots) find a spot without moving the others.
  const layout = useRef<ReturnType<typeof createLayout>>();
  if (!layout.current) {
    layout.current = createLayout({
      width: size.w,
      height: size.h,
      covered,
      groups,
      seed: Math.floor(Math.random() * 2 ** 32),
    });
  }

  useEffect(() => {
    setSaved(readSaved());
    const onResize = () => setSize({ w: window.innerWidth, h: window.innerHeight - TASKBAR_HEIGHT });
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const pointOf = (item: DesktopIconItem): Point =>
    clampPoint(saved[item.id] ?? layout.current!.place({ id: item.id, group: item.group }), size.w, size.h);

  const save = (next: Record<string, Point>) => {
    setSaved(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Not remembered, but still moved for this visit.
    }
  };

  const onDown = (e: PointerEvent<HTMLButtonElement>, id: string) => {
    e.stopPropagation();
    onSelect(id);
    raised.current[id] = ++top.current;
    if (e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    press.current = { id, sx: e.clientX, sy: e.clientY, active: false };
  };

  const onMove = (e: PointerEvent<HTMLButtonElement>) => {
    const p = press.current;
    if (!p) return;
    const dx = e.clientX - p.sx;
    const dy = e.clientY - p.sy;
    if (!p.active && Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
    p.active = true;
    setDrag({ id: p.id, dx, dy });
  };

  const onUp = (e: PointerEvent<HTMLButtonElement>, item: DesktopIconItem) => {
    const p = press.current;
    press.current = null;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
    if (!p?.active) return;
    const from = pointOf(item);
    // Dropped exactly where it was let go: no snapping to anything.
    save({
      ...saved,
      [item.id]: clampPoint({ x: from.x + (e.clientX - p.sx), y: from.y + (e.clientY - p.sy) }, size.w, size.h),
    });
    setDrag(null);
  };

  const onCancel = () => {
    press.current = null;
    setDrag(null);
  };

  return (
    <div className={styles.icons}>
      {items.map((item) => {
        const at = pointOf(item);
        const dragging = drag?.id === item.id;
        return (
          <button
            key={item.id}
            type="button"
            className={cn(styles.icon, selected === item.id && styles.iconSelected, dragging && styles.iconDragging)}
            style={{
              left: at.x,
              top: at.y,
              zIndex: dragging ? 1000 : raised.current[item.id],
              transform: dragging ? `translate(${drag.dx}px, ${drag.dy}px)` : undefined,
            }}
            onPointerDown={(e) => onDown(e, item.id)}
            onPointerMove={onMove}
            onPointerUp={(e) => onUp(e, item)}
            onPointerCancel={onCancel}
            onContextMenu={(e) => e.stopPropagation()}
            onDoubleClick={item.open}
            onKeyDown={(e) => e.key === 'Enter' && item.open()}
            // The browser's own drag ghost would fight ours.
            onDragStart={(e) => e.preventDefault()}
          >
            <span className={styles.iconArt}>{item.icon}</span>
            <span className={styles.iconLabel}>{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}
