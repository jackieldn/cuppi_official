'use client';

// The desktop behind the windows: the wallpaper, the app icons, and the
// right-click menu.

import { useEffect, useLayoutEffect, useRef, useState, type MouseEvent } from 'react';

import { useDesktop, type AppId } from './desktop-context';
import { DesktopIcons } from './desktop-icons';
import { isAdditive, MarqueeBox, useMarquee } from './marquee-select';
import { WALLPAPERS } from './wallpapers';

interface MenuItem {
  label: string;
  app: AppId;
}

const MENU_ITEMS: MenuItem[] = [{ label: 'Change Background…', app: 'wallpaper' }];

export function DesktopSurface() {
  const desktop = useDesktop();
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);
  const [selectedIcons, setSelectedIcons] = useState<string[]>([]);
  const marquee = useMarquee({ onSelect: setSelectedIcons, current: selectedIcons });

  // Our own menu instead of the browser's.
  const onContextMenu = (e: MouseEvent) => {
    e.preventDefault();
    setMenu({ x: e.clientX, y: e.clientY });
  };

  return (
    <>
      <div
        data-desktop-surface=""
        className="fixed inset-0 z-0 animate-in fade-in duration-500"
        onContextMenu={onContextMenu}
        {...marquee.handlers}
        onPointerDown={(e) => {
          setMenu(null);
          // A click on empty desktop clears the icon selection (unless adding to it),
          // and dragging from there draws a selection rectangle.
          if (!isAdditive(e)) setSelectedIcons([]);
          marquee.handlers.onPointerDown(e);
        }}
      >
        {/* Every wallpaper is a layer; the chosen one fades in over the rest. */}
        <div aria-hidden="true" className="absolute inset-0">
          {WALLPAPERS.map((w) => (
            <div
              key={w.id}
              className="absolute inset-0 transition-opacity duration-700 ease-in-out"
              style={{ background: w.background, opacity: w.id === desktop.wallpaper ? 1 : 0 }}
            />
          ))}
        </div>
        <DesktopIcons selected={selectedIcons} onSelect={setSelectedIcons} />
        <MarqueeBox box={marquee.box} className="border border-palette-cream/70 bg-palette-lagoon/25" />
      </div>

      {menu && (
        <ContextMenu
          x={menu.x}
          y={menu.y}
          onClose={() => setMenu(null)}
          onPick={(item) => {
            setMenu(null);
            desktop.openApp(item.app);
          }}
        />
      )}
    </>
  );
}

interface ContextMenuProps {
  x: number;
  y: number;
  onClose: () => void;
  onPick: (item: MenuItem) => void;
}

function ContextMenu({ x, y, onClose, onPick }: ContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x, y });

  // Open at the cursor, flipped back inside the screen near the edges.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const { offsetWidth: w, offsetHeight: h } = el;
    setPos({
      x: x + w > window.innerWidth - 4 ? Math.max(4, x - w) : x,
      y: y + h > window.innerHeight - 4 ? Math.max(4, y - h) : y,
    });
    el.querySelector<HTMLElement>('[role="menuitem"]')?.focus({ preventScroll: true });
  }, [x, y]);

  // Any click elsewhere, Escape, or leaving the page closes it.
  useEffect(() => {
    const onPointerDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) onClose();
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('pointerdown', onPointerDown, true);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('blur', onClose);
    window.addEventListener('resize', onClose);
    return () => {
      window.removeEventListener('pointerdown', onPointerDown, true);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('blur', onClose);
      window.removeEventListener('resize', onClose);
    };
  }, [onClose]);

  // Up and down move between items, like a native menu.
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    e.preventDefault();
    const items = [...(ref.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [])];
    const i = items.indexOf(document.activeElement as HTMLElement);
    const next = e.key === 'ArrowDown' ? (i + 1) % items.length : (i - 1 + items.length) % items.length;
    items[next]?.focus();
  };

  return (
    <div
      ref={ref}
      role="menu"
      aria-label="Desktop"
      className="fixed z-[70] min-w-[200px] animate-in fade-in zoom-in-95 rounded-lg border border-palette-lagoon/40 bg-palette-ink/80 p-1 text-[13px] text-palette-cream shadow-[0_12px_40px_-8px_rgba(0,0,0,0.6)] backdrop-blur-xl duration-100"
      style={{ left: pos.x, top: pos.y }}
      onContextMenu={(e) => e.preventDefault()}
      onKeyDown={onKeyDown}
    >
      {MENU_ITEMS.map((item) => (
        <button
          key={item.label}
          type="button"
          role="menuitem"
          className="flex w-full cursor-default items-center rounded-md px-2.5 py-1 text-left outline-none hover:bg-primary focus:bg-primary"
          onClick={() => onPick(item)}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
