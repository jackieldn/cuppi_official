'use client';

// The desktop's menu bar along the top of the screen. The clock on the right
// is also the Time Machine: click it to travel to another era.

import { useEffect, useRef, useState } from 'react';
import { Check } from 'lucide-react';

import { cn } from '@/lib/utils';
import { MENU_BAR_HEIGHT, useDesktop, type Era } from './desktop-context';
import { unlockDosAudio } from './dos/dos-sound';

const dateFormat = new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
const timeFormat = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit' });

const ERAS: { id: Era; label: string; detail: string }[] = [
  { id: 'now', label: 'Today', detail: 'The desktop' },
  { id: '1997', label: 'July 1997', detail: 'JackDOS 6.22' },
];

/** The current time, updated on the minute (not every second). */
function useNow() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const schedule = () => {
      timer = setTimeout(() => {
        setNow(new Date());
        schedule();
      }, 60_000 - (Date.now() % 60_000) + 20);
    };
    schedule();
    return () => clearTimeout(timer);
  }, []);
  return now;
}

function TimeMachine() {
  const { era, setEra } = useDesktop();
  const now = useNow();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // Clicking elsewhere or pressing Escape closes it, like a native menu.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    const onBlur = () => setOpen(false);
    window.addEventListener('pointerdown', onPointerDown, true);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('pointerdown', onPointerDown, true);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('blur', onBlur);
    };
  }, [open]);

  // Opening the menu puts keyboard focus on the current era.
  useEffect(() => {
    if (open) rootRef.current?.querySelector<HTMLElement>('[aria-checked="true"]')?.focus({ preventScroll: true });
  }, [open]);

  const onMenuKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    e.preventDefault();
    const items = [...(rootRef.current?.querySelectorAll<HTMLElement>('[role="menuitemradio"]') ?? [])];
    const i = items.indexOf(document.activeElement as HTMLElement);
    items[(i + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length]?.focus();
  };

  return (
    <div ref={rootRef} className="relative h-full">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Time Machine. It's ${dateFormat.format(now)}, ${timeFormat.format(now)}`}
        className={cn(
          'flex h-full items-center gap-2 rounded px-2 tabular-nums outline-none transition-colors hover:bg-palette-cream/10 focus-visible:ring-2 focus-visible:ring-ring',
          open && 'bg-palette-cream/15',
        )}
        onClick={() => setOpen((o) => !o)}
      >
        <time dateTime={now.toISOString()} className="flex gap-2">
          <span>{dateFormat.format(now).replace(',', '')}</span>
          <span>{timeFormat.format(now)}</span>
        </time>
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Time Machine"
          className="absolute right-0 top-[calc(100%+4px)] z-[70] min-w-[230px] animate-in fade-in zoom-in-95 rounded-lg border border-palette-lagoon/40 bg-palette-ink/85 p-1 text-[13px] text-palette-cream shadow-[0_12px_40px_-8px_rgba(0,0,0,0.6)] backdrop-blur-xl duration-100"
          onKeyDown={onMenuKeyDown}
        >
          <p className="px-2.5 pb-1 pt-1.5 text-[11px] font-semibold uppercase tracking-wider text-palette-cream/50">
            Time Machine
          </p>
          {ERAS.map((e) => (
            <button
              key={e.id}
              type="button"
              role="menuitemradio"
              aria-checked={era === e.id}
              className="flex w-full cursor-default items-center gap-2 rounded-md px-2.5 py-1 text-left outline-none hover:bg-primary focus:bg-primary"
              onClick={() => {
                setOpen(false);
                // Browsers only allow sound that starts from a click: wake the audio now.
                if (e.id === '1997') unlockDosAudio();
                setEra(e.id);
              }}
            >
              <Check aria-hidden="true" className={cn('size-3.5 shrink-0', era === e.id ? 'opacity-100' : 'opacity-0')} />
              <span className="flex-1">{e.label}</span>
              <span className="text-palette-cream/55">{e.detail}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function MenuBar({ visible }: { visible: boolean }) {
  return (
    <header
      className={cn(
        'fixed inset-x-0 top-0 z-40 flex select-none items-center justify-end border-b border-palette-lagoon/20 bg-palette-ink/45 px-2 text-[13px] font-medium text-palette-cream/90 backdrop-blur-xl transition-transform duration-300 ease-out',
        !visible && '-translate-y-full',
      )}
      style={{ height: MENU_BAR_HEIGHT }}
      // Part of the desktop: no browser menu here either.
      onContextMenu={(e) => e.preventDefault()}
    >
      <TimeMachine />
    </header>
  );
}
