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
import { clampGroupDelta, isAdditive } from '../marquee-select';
import { clampPoint, createLayout, ICON_H, ICON_W, type Point } from './xp-icon-layout';
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
  selected: string[];
  onSelect: (ids: string[]) => void;
  /** The strip of the desktop (left and right edge, in pixels) that a window covers when the PC starts. */
  covered?: [number, number];
  /** The groups that can be gathered into a corner. */
  groups: string[];
}

export function DesktopIcons({ items, selected, onSelect, covered, groups }: Props) {
  const [saved, setSaved] = useState<Record<string, Point>>({});
  const [size, setSize] = useState(() => ({ w: window.innerWidth, h: window.innerHeight - TASKBAR_HEIGHT }));
  // The icons being dragged (one, or the whole selection), and how far they have been taken.
  const [drag, setDrag] = useState<{ ids: string[]; dx: number; dy: number } | null>(null);
  const press = useRef<{ id: string; ids: string[]; sx: number; sy: number; active: boolean; dx: number; dy: number } | null>(
    null,
  );
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
    const isSelected = selected.includes(id);
    raised.current[id] = ++top.current;

    if (e.button !== 0) {
      if (!isSelected) onSelect([id]);
      return;
    }
    if (isAdditive(e)) {
      // Ctrl/Cmd/Shift-click adds an icon to the selection, or takes it back out.
      onSelect(isSelected ? selected.filter((s) => s !== id) : [...selected, id]);
      if (isSelected) return;
    } else if (!isSelected) {
      onSelect([id]);
    }

    // Pressing one of several selected icons drags them all.
    const ids = isAdditive(e) || isSelected ? [...new Set([...selected, id])] : [id];
    e.currentTarget.setPointerCapture(e.pointerId);
    press.current = { id, ids, sx: e.clientX, sy: e.clientY, active: false, dx: 0, dy: 0 };
  };

  const onMove = (e: PointerEvent<HTMLButtonElement>) => {
    const p = press.current;
    if (!p) return;
    // The button was let go somewhere we never heard about: drop them, don't keep carrying them.
    if (e.buttons === 0) return onUp(e);
    const rawX = e.clientX - p.sx;
    const rawY = e.clientY - p.sy;
    if (!p.active && Math.hypot(rawX, rawY) < DRAG_THRESHOLD) return;
    p.active = true;
    // Slid back as one, so the group keeps its shape against the edge of the desktop.
    const { dx, dy } = clampGroupDelta(
      p.ids.map((id) => pointOf(items.find((item) => item.id === id)!)),
      size.w - ICON_W,
      size.h - ICON_H,
      0,
      rawX,
      rawY,
    );
    p.dx = dx;
    p.dy = dy;
    for (const id of p.ids) raised.current[id] = ++top.current;
    setDrag({ ids: p.ids, dx, dy });
  };

  const onUp = (e: PointerEvent<HTMLButtonElement>) => {
    const p = press.current;
    press.current = null;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
    if (!p) return;
    if (!p.active) {
      // A plain click on one of several selected icons picks just that one.
      if (p.ids.length > 1 && !isAdditive(e)) onSelect([p.id]);
      return;
    }
    // Dropped exactly where it was let go: no snapping to anything.
    const next = { ...saved };
    for (const id of p.ids) {
      const item = items.find((i) => i.id === id);
      if (!item) continue;
      const from = pointOf(item);
      next[id] = clampPoint({ x: from.x + p.dx, y: from.y + p.dy }, size.w, size.h);
    }
    save(next);
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
        const dragging = drag?.ids.includes(item.id) ? drag : null;
        return (
          <button
            key={item.id}
            type="button"
            data-desktop-icon={item.id}
            className={cn(
              styles.icon,
              selected.includes(item.id) && styles.iconSelected,
              dragging && styles.iconDragging,
            )}
            style={{
              left: at.x,
              top: at.y,
              zIndex: dragging ? 1000 : raised.current[item.id],
              transform: dragging ? `translate(${dragging.dx}px, ${dragging.dy}px)` : undefined,
            }}
            onPointerDown={(e) => onDown(e, item.id)}
            onPointerMove={onMove}
            onPointerUp={onUp}
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
