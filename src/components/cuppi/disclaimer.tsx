'use client';

import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import * as Popover from '@radix-ui/react-popover';
import { Info } from 'lucide-react';
import type { Disclaimer } from '@/lib/disclaimers';

const DisclaimersContext = createContext<ReadonlyMap<string, Disclaimer>>(new Map());

/** Makes the site's disclaimers available to every `{i:id}` tag below it. The Cuppi layout wraps the whole site in one. */
export function DisclaimersProvider({ items, children }: { items: Disclaimer[]; children: React.ReactNode }) {
  const map = useMemo(() => new Map(items.map((d) => [d.id, d])), [items]);
  return <DisclaimersContext.Provider value={map}>{children}</DisclaimersContext.Provider>;
}

/** The icon for the disclaimer with this id. A tag with no matching disclaimer shows nothing, rather than a broken icon. */
export function DisclaimerRef({ id }: { id: string }) {
  const d = useContext(DisclaimersContext).get(id);
  return d ? <DisclaimerMark text={d.text} label={d.label} /> : null;
}

const OPEN_DELAY = 120;
const CLOSE_DELAY = 220;

/**
 * A small (i) beside a word, with the disclaimer in a bubble. It opens:
 *   - on a mouse hovering over it (and stays while the mouse is over the bubble, so the words can be read or selected),
 *   - when it is reached with the keyboard,
 *   - on a tap or Enter / Space (a touch screen has no hover), and closes on a second tap, Escape or a tap elsewhere.
 * The bubble is drawn outside the card it sits in, so a colour block's rounded edge never clips it, and inside the
 * Cuppi theme (the page, or the admin's preview), so it has the right colours in light and dark.
 */
export function DisclaimerMark({ text, label }: { text: string; label?: string }) {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const lastPointer = useRef('');

  const later = useCallback((to: boolean, ms: number) => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setOpen(to), ms);
  }, []);
  const now = useCallback((to: boolean) => {
    clearTimeout(timer.current);
    setOpen(to);
  }, []);

  return (
    <Popover.Root open={open} onOpenChange={now}>
      <Popover.Trigger asChild>
        <button
          ref={trigger}
          type="button"
          aria-label={label ? `Important information: ${label}` : 'Important information'}
          aria-expanded={open}
          onPointerDown={(e) => {
            lastPointer.current = e.pointerType;
          }}
          onPointerEnter={(e) => e.pointerType === 'mouse' && later(true, OPEN_DELAY)}
          onPointerLeave={(e) => e.pointerType === 'mouse' && later(false, CLOSE_DELAY)}
          onFocus={(e) => e.currentTarget.matches(':focus-visible') && now(true)}
          onBlur={() => now(false)}
          onClick={(e) => {
            // The click that follows a mouse hover must not close what the hover opened; a tap or a key press toggles.
            e.preventDefault();
            const mouse = lastPointer.current === 'mouse';
            lastPointer.current = '';
            now(mouse ? true : !open);
          }}
          className="relative ml-[0.2em] inline-flex shrink-0 select-none items-center justify-center rounded-full align-[0.45em] text-current opacity-60 transition-opacity before:absolute before:-inset-2 before:content-[''] hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cuppi-brand-deep data-[state=open]:opacity-100"
          style={{ width: 'max(1rem, 0.4em)', height: 'max(1rem, 0.4em)' }}
        >
          <Info className="h-full w-full" strokeWidth={2.4} aria-hidden />
        </button>
      </Popover.Trigger>
      <Popover.Portal container={(trigger.current?.closest('.theme-cuppi') as HTMLElement | null) ?? undefined}>
        <Popover.Content
          side="top"
          sideOffset={10}
          collisionPadding={12}
          onOpenAutoFocus={(e) => e.preventDefault()}
          onCloseAutoFocus={(e) => e.preventDefault()}
          onPointerEnter={(e) => e.pointerType === 'mouse' && clearTimeout(timer.current)}
          onPointerLeave={(e) => e.pointerType === 'mouse' && later(false, CLOSE_DELAY)}
          className="z-[60] w-[min(21rem,calc(100vw-2rem))] rounded-2xl border border-cuppi-line bg-cuppi-card p-4 text-left font-body text-sm font-normal not-italic leading-relaxed tracking-normal text-cuppi-ink shadow-[0_12px_30px_rgb(var(--c-shadow)/0.18)] outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=top]:slide-in-from-bottom-2 data-[side=bottom]:slide-in-from-top-2"
        >
          <p className="whitespace-pre-line">{text}</p>
          <Popover.Arrow className="fill-cuppi-card" width={14} height={7} />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
