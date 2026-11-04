'use client';

// The three macOS window buttons. Their symbols show when the group is hovered.

import { cn } from '@/lib/utils';

interface TrafficLightsProps {
  onClose: () => void;
  /** Leave out for a window that can't be minimised: the dot shows greyed out. */
  onMinimise?: () => void;
  /** Leave out for a window that can't go full screen. */
  onZoom?: () => void;
  /** The page is full screen, so green means "leave full screen". */
  fullScreen?: boolean;
}

const dot =
  'flex size-3 items-center justify-center rounded-full shadow-[inset_0_0_0_0.5px_rgba(0,0,0,0.25)] transition-transform duration-150 ease-out hover:scale-125 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:bg-foreground/20 disabled:hover:scale-100';
const glyph =
  'size-2 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 [:disabled>&]:hidden';

export function TrafficLights({ onClose, onMinimise, onZoom, fullScreen }: TrafficLightsProps) {
  // Buttons stop pointerdown so pressing one never starts a window drag.
  const stop = (e: React.PointerEvent) => e.stopPropagation();

  return (
    <div className="group flex items-center gap-2" onPointerDown={stop} onDoubleClick={(e) => e.stopPropagation()}>
      <button type="button" aria-label="Close window" className={cn(dot, 'bg-[#ff5f57]')} onClick={onClose}>
        <svg viewBox="0 0 8 8" className={glyph} stroke="#4d0000" strokeWidth="1.2" strokeLinecap="round">
          <path d="M2 2l4 4M6 2L2 6" />
        </svg>
      </button>
      <button
        type="button"
        aria-label="Minimise window"
        className={cn(dot, 'bg-[#febc2e]')}
        onClick={onMinimise}
        disabled={!onMinimise}
      >
        <svg viewBox="0 0 8 8" className={glyph} stroke="#5a3a00" strokeWidth="1.3" strokeLinecap="round">
          <path d="M1.75 4h4.5" />
        </svg>
      </button>
      <button
        type="button"
        aria-label={fullScreen ? 'Exit full screen' : 'Enter full screen'}
        className={cn(dot, 'bg-[#28c840]')}
        onClick={onZoom}
        disabled={!onZoom}
      >
        <svg viewBox="0 0 8 8" className={glyph} fill="#004d00">
          {fullScreen ? (
            // Arrows pointing in.
            <>
              <path d="M4 4V1.2L1.2 4z" transform="translate(-0.3 -0.3)" />
              <path d="M4 4v2.8L6.8 4z" transform="translate(0.3 0.3)" />
            </>
          ) : (
            // Arrows pointing out.
            <>
              <path d="M1.5 1.5h3.3L1.5 4.8z" />
              <path d="M6.5 6.5H3.2l3.3-3.3z" />
            </>
          )}
        </svg>
      </button>
    </div>
  );
}
