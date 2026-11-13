'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Moon, Sun, SunMoon } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  THEME_PREFS,
  getThemePref,
  resolveTheme,
  setThemePref,
  subscribeThemePref,
  syncBrowserChrome,
  type ThemePref,
} from '@/lib/theme';

const OPTIONS: Record<ThemePref, { label: string; Icon: typeof Sun }> = {
  light: { label: 'Light', Icon: Sun },
  auto: { label: 'Auto', Icon: SunMoon },
  dark: { label: 'Dark', Icon: Moon },
};

/**
 * Light / Auto / Dark, for the footer. A radio group: one choice at a time, arrow keys move
 * between them, and Tab goes through it as a single stop. The highlight glides to the chosen
 * option the same way the menu's does.
 *
 * What is chosen lives on <html> (the head script put it there before the page painted), so this
 * only reads it. On the server it shows "Auto", then settles on the real choice once hydrated.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const pref = useSyncExternalStore(subscribeThemePref, getThemePref, () => 'auto' as ThemePref);
  const refs = useRef<Record<ThemePref, HTMLButtonElement | null>>({ light: null, auto: null, dark: null });

  // The highlight should appear in place on load, then glide on changes. Switching its transition
  // on a beat after mount means the first paint never animates from "Auto" to the saved choice.
  const [glide, setGlide] = useState(false);
  useEffect(() => {
    syncBrowserChrome(resolveTheme(getThemePref(), window.matchMedia('(prefers-color-scheme: dark)').matches));
    const id = requestAnimationFrame(() => setGlide(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const index = THEME_PREFS.indexOf(pref);

  function onKeyDown(e: React.KeyboardEvent) {
    const step = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    const next = THEME_PREFS[(index + step + THEME_PREFS.length) % THEME_PREFS.length];
    setThemePref(next);
    refs.current[next]?.focus();
  }

  return (
    <div
      role="radiogroup"
      aria-label="Colour theme"
      onKeyDown={onKeyDown}
      className={cn('relative inline-grid h-11 grid-cols-[repeat(3,minmax(0,1fr))] rounded-full border border-cuppi-line bg-cuppi-paper p-1', className)}
    >
      <span
        aria-hidden
        className={cn(
          'absolute inset-y-1 left-1 w-[calc((100%-0.5rem)/3)] rounded-full bg-cuppi-honey-soft',
          glide && 'transition-transform duration-500 [transition-timing-function:var(--ease-spring)] motion-reduce:transition-none',
        )}
        style={{ transform: `translateX(${index * 100}%)` }}
      />
      {THEME_PREFS.map((value) => {
        const { label, Icon } = OPTIONS[value];
        const selected = value === pref;
        return (
          <button
            key={value}
            ref={(el) => {
              refs.current[value] = el;
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={label}
            tabIndex={selected ? 0 : -1}
            onClick={() => setThemePref(value)}
            className={cn(
              'relative flex items-center justify-center gap-1.5 rounded-full px-3.5 text-sm font-medium transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cuppi-brand focus-visible:ring-offset-2 focus-visible:ring-offset-cuppi-paper',
              selected ? 'text-cuppi-ink' : 'text-cuppi-ink-soft hover:text-cuppi-ink',
            )}
          >
            <Icon className="h-4 w-4 shrink-0" aria-hidden />
            {/* Words where there is room (phones, wide screens); icons alone in between. */}
            <span className="md:hidden lg:inline">{label}</span>
          </button>
        );
      })}
    </div>
  );
}
