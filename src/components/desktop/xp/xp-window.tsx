'use client';

// A Poot XP window: glossy black title bar with minimise, maximise and close,
// dragged by the title bar and resized from the bottom-right corner.
// Dragging writes straight to the element and only tells React at the end,
// so a heavy page inside (the browser) doesn't make the window lag.

import { useRef, useState, type PointerEvent, type ReactNode } from 'react';

import { cn } from '@/lib/utils';
import { TitleGlyph } from './xp-icons';
import styles from './xp.module.css';

export const TASKBAR_HEIGHT = 30;
const TITLE_HEIGHT = 29;

export interface XpRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface XpWindowProps {
  title: string;
  icon: ReactNode;
  initial: XpRect;
  /** Fixed-size windows (message boxes) can't be maximised or resized. */
  resizable?: boolean;
  startMaximised?: boolean;
  minimised: boolean;
  active: boolean;
  z: number;
  onFocus: () => void;
  onMinimise?: () => void;
  onClose: () => void;
  minW?: number;
  minH?: number;
  children: ReactNode;
}

function clamp(r: XpRect): XpRect {
  const vw = window.innerWidth;
  const vh = window.innerHeight - TASKBAR_HEIGHT;
  return {
    ...r,
    x: Math.min(Math.max(r.x, 80 - r.w), vw - 80),
    y: Math.min(Math.max(r.y, 0), vh - TITLE_HEIGHT),
  };
}

export function XpWindow({
  title,
  icon,
  initial,
  resizable = true,
  startMaximised = false,
  minimised,
  active,
  z,
  onFocus,
  onMinimise,
  onClose,
  minW = 300,
  minH = 200,
  children,
}: XpWindowProps) {
  const [rect, setRect] = useState<XpRect>(() => clamp(initial));
  const [maximised, setMaximised] = useState(startMaximised);
  const [dragging, setDragging] = useState(false);
  const frameRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ sx: number; sy: number; start: XpRect; kind: 'move' | 'size'; latest: XpRect } | null>(null);

  const begin = (e: PointerEvent, kind: 'move' | 'size') => {
    if (e.button !== 0 || (maximised && kind === 'move')) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { sx: e.clientX, sy: e.clientY, start: rect, kind, latest: rect };
    setDragging(true);
  };

  const move = (e: PointerEvent) => {
    const d = dragRef.current;
    const el = frameRef.current;
    if (!d || !el) return;
    const dx = e.clientX - d.sx;
    const dy = e.clientY - d.sy;
    if (d.kind === 'move') {
      d.latest = clamp({ ...d.start, x: d.start.x + dx, y: d.start.y + dy });
      el.style.left = `${d.latest.x}px`;
      el.style.top = `${d.latest.y}px`;
    } else {
      const maxW = window.innerWidth - d.start.x;
      const maxH = window.innerHeight - TASKBAR_HEIGHT - d.start.y;
      d.latest = {
        ...d.start,
        w: Math.min(maxW, Math.max(minW, d.start.w + dx)),
        h: Math.min(maxH, Math.max(minH, d.start.h + dy)),
      };
      el.style.width = `${d.latest.w}px`;
      el.style.height = `${d.latest.h}px`;
    }
  };

  const end = () => {
    const d = dragRef.current;
    dragRef.current = null;
    if (d) setRect(d.latest);
    setDragging(false);
  };

  const toggleMax = () => resizable && setMaximised((m) => !m);

  const style = maximised
    ? { left: 0, top: 0, width: '100%', height: `calc(100% - ${TASKBAR_HEIGHT}px)` }
    : { left: rect.x, top: rect.y, width: rect.w, height: resizable ? rect.h : undefined };

  return (
    <div
      ref={frameRef}
      role="dialog"
      aria-label={title}
      className={cn(styles.window, maximised && styles.maximised, !active && styles.inactive)}
      style={{ ...style, zIndex: z, display: minimised ? 'none' : undefined }}
      onPointerDownCapture={onFocus}
    >
      <div
        className={styles.titleBar}
        onPointerDown={(e) => begin(e, 'move')}
        onPointerMove={move}
        onPointerUp={end}
        onPointerCancel={end}
        onDoubleClick={toggleMax}
      >
        <span className={styles.titleIcon}>{icon}</span>
        <span className={styles.titleText}>{title}</span>
        <div className={styles.titleButtons} onPointerDown={(e) => e.stopPropagation()} onDoubleClick={(e) => e.stopPropagation()}>
          {onMinimise && (
            <button type="button" className={styles.titleButton} aria-label="Minimise" onClick={onMinimise}>
              <TitleGlyph kind="min" />
            </button>
          )}
          {resizable && (
            <button
              type="button"
              className={styles.titleButton}
              aria-label={maximised ? 'Restore down' : 'Maximise'}
              onClick={toggleMax}
            >
              <TitleGlyph kind={maximised ? 'restore' : 'max'} />
            </button>
          )}
          <button type="button" className={cn(styles.titleButton, styles.closeButton)} aria-label="Close" onClick={onClose}>
            <TitleGlyph kind="close" />
          </button>
        </div>
      </div>
      {/* While dragging, the page inside ignores the pointer (and doesn't select text). */}
      <div className={styles.windowBody} style={dragging ? { pointerEvents: 'none', userSelect: 'none' } : undefined}>
        {children}
      </div>
      {resizable && !maximised && (
        <div
          aria-hidden="true"
          className={styles.resize}
          onPointerDown={(e) => begin(e, 'size')}
          onPointerMove={move}
          onPointerUp={end}
          onPointerCancel={end}
        />
      )}
    </div>
  );
}
