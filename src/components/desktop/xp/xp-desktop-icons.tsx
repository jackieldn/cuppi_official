'use client';

// The icons on the Poot XP desktop. Like the real thing they can be dragged
// anywhere and snap to the grid when let go; one dropped on another icon
// takes the nearest free spot. Where they were left is remembered.

import { useEffect, useMemo, useRef, useState, type PointerEvent, type ReactNode } from 'react';

import { cn } from '@/lib/utils';
import { TASKBAR_HEIGHT } from './xp-window';
import styles from './xp.module.css';

export interface DesktopIconItem {
  id: string;
  label: string;
  icon: ReactNode;
  open: () => void;
}

interface Cell {
  col: number;
  row: number;
}

const CELL_W = 98;
const CELL_H = 103;
const PAD_X = 7;
const PAD_Y = 12;
/** Pointer travel before a press turns into a drag, so a double-click stays a double-click. */
const DRAG_THRESHOLD = 4;
const STORAGE_KEY = 'xp-icon-cells';

const key = (c: Cell) => `${c.col}:${c.row}`;

function readSaved(): Record<string, Cell> {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as Record<string, Cell>;
    const clean: Record<string, Cell> = {};
    for (const [id, c] of Object.entries(saved)) {
      if (Number.isInteger(c?.col) && Number.isInteger(c?.row) && c.col >= 0 && c.row >= 0) clean[id] = c;
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
}

export function DesktopIcons({ items, selected, onSelect }: Props) {
  const [moved, setMoved] = useState<Record<string, Cell>>({});
  const [size, setSize] = useState(() => ({ w: window.innerWidth, h: window.innerHeight - TASKBAR_HEIGHT }));
  // The icon being dragged, and how far it has been taken from its cell.
  const [drag, setDrag] = useState<{ id: string; dx: number; dy: number } | null>(null);
  const press = useRef<{ id: string; sx: number; sy: number; active: boolean } | null>(null);

  useEffect(() => {
    setMoved(readSaved());
    const onResize = () => setSize({ w: window.innerWidth, h: window.innerHeight - TASKBAR_HEIGHT });
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const cols = Math.max(1, Math.floor((size.w - PAD_X) / CELL_W));
  const rows = Math.max(1, Math.floor((size.h - PAD_Y) / CELL_H));

  const clampCell = (c: Cell): Cell => ({ col: Math.min(c.col, cols - 1), row: Math.min(c.row, rows - 1) });

  // Icons nobody has moved fill the first free cells, top to bottom then left to right.
  const cells = useMemo(() => {
    const placed: Record<string, Cell> = {};
    const taken = new Set<string>();
    for (const item of items) {
      const c = moved[item.id];
      if (c) {
        const at = { col: Math.min(c.col, cols - 1), row: Math.min(c.row, rows - 1) };
        placed[item.id] = at;
        taken.add(key(at));
      }
    }
    let next = 0;
    for (const item of items) {
      if (placed[item.id]) continue;
      let cell: Cell;
      do {
        cell = { col: Math.floor(next / rows), row: next % rows };
        next += 1;
      } while (taken.has(key(cell)) && next < cols * rows + items.length);
      placed[item.id] = cell;
      taken.add(key(cell));
    }
    return placed;
  }, [items, moved, cols, rows]);

  const save = (next: Record<string, Cell>) => {
    setMoved(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Not remembered, but still moved for this visit.
    }
  };

  /** The wanted cell, or the closest free one if another icon is already there. */
  const settle = (id: string, want: Cell): Cell => {
    const taken = new Set(items.filter((i) => i.id !== id).map((i) => key(cells[i.id])));
    if (!taken.has(key(want))) return want;
    let best: Cell | null = null;
    let bestDist = Infinity;
    for (let col = 0; col < cols; col++) {
      for (let row = 0; row < rows; row++) {
        const c = { col, row };
        const dist = (col - want.col) ** 2 + (row - want.row) ** 2;
        if (dist < bestDist && !taken.has(key(c))) {
          best = c;
          bestDist = dist;
        }
      }
    }
    return best ?? cells[id];
  };

  const onDown = (e: PointerEvent<HTMLButtonElement>, id: string) => {
    e.stopPropagation();
    onSelect(id);
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

  const onUp = (e: PointerEvent<HTMLButtonElement>) => {
    const p = press.current;
    press.current = null;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
    if (!p?.active) return;
    const from = cells[p.id];
    const x = PAD_X + from.col * CELL_W + (e.clientX - p.sx);
    const y = PAD_Y + from.row * CELL_H + (e.clientY - p.sy);
    const want = clampCell({
      col: Math.max(0, Math.round((x - PAD_X) / CELL_W)),
      row: Math.max(0, Math.round((y - PAD_Y) / CELL_H)),
    });
    save({ ...Object.fromEntries(items.map((i) => [i.id, cells[i.id]])), [p.id]: settle(p.id, want) });
    setDrag(null);
  };

  const onCancel = () => {
    press.current = null;
    setDrag(null);
  };

  return (
    <div className={styles.icons}>
      {items.map((item) => {
        const cell = cells[item.id];
        const dragging = drag?.id === item.id;
        return (
          <button
            key={item.id}
            type="button"
            className={cn(styles.icon, selected === item.id && styles.iconSelected, dragging && styles.iconDragging)}
            style={{
              left: PAD_X + cell.col * CELL_W,
              top: PAD_Y + cell.row * CELL_H,
              transform: dragging ? `translate(${drag.dx}px, ${drag.dy}px)` : undefined,
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
