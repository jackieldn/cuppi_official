'use client';

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { Check, ChevronDown, Link2, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Roll } from './animated-number';

/**
 * The calculator's frame: the inputs on one side, the answer on the other (stacked on a phone). On a wide screen the
 * inputs stay in view as the answer scrolls, and let go where the comparison (`below`) begins. If they are taller than
 * the screen they scroll inside their own card.
 */
export function CalculatorFrame({ inputs, results, below }: { inputs: ReactNode; results: ReactNode; /** Full width under both: the comparison, once there is one. */ below?: ReactNode }) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
        <div className="min-w-0 space-y-5 rounded-[2rem] border border-cuppi-line bg-cuppi-card p-5 sm:p-7 lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto lg:[scrollbar-width:thin]">{inputs}</div>
        <div className="min-w-0 space-y-5">{results}</div>
      </div>
      {below}
    </div>
  );
}

/**
 * The switch above the answer: a few views of the same result, one showing at a time. The highlight moves the way the
 * top menu's does: it rests on the chosen view and glides to whichever one the pointer is over, then back again.
 */
export function ViewToggle<V extends string>({ views, value, onChange, panelId }: { views: readonly { value: V; label: string }[]; value: V; onChange: (v: V) => void; panelId: string }) {
  const [pill, setPill] = useState<{ x: number; w: number } | null>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Record<string, HTMLElement | null>>({});
  const moveTo = useCallback((key: string) => {
    const el = itemRefs.current[key];
    setPill(el ? { x: el.offsetLeft, w: el.offsetWidth } : null);
  }, []);
  useLayoutEffect(() => {
    moveTo(value);
    // Widths change when the web font arrives and when the window resizes, so measure again then.
    const track = trackRef.current;
    const observer = track && typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => moveTo(value)) : null;
    if (track) observer?.observe(track);
    document.fonts?.ready.then(() => moveTo(value));
    return () => observer?.disconnect();
  }, [value, views.length, moveTo]);

  return (
    <div className="rounded-full border border-cuppi-line bg-cuppi-card p-1">
      <div ref={trackRef} role="tablist" aria-label="What to show" className="relative flex" onMouseLeave={() => moveTo(value)}>
        <span
          aria-hidden
          className={cn(
            'absolute inset-y-0 left-0 rounded-full bg-cuppi-honey-soft transition-[transform,width,opacity] duration-500 [transition-timing-function:var(--ease-spring)] motion-reduce:transition-none',
            pill ? 'opacity-100' : 'opacity-0',
          )}
          style={{ transform: `translateX(${pill?.x ?? 0}px)`, width: pill?.w ?? 0 }}
        />
        {views.map((t) => (
          <button
            key={t.value}
            ref={(el) => {
              itemRefs.current[t.value] = el;
            }}
            id={`${panelId}-${t.value}`}
            type="button"
            role="tab"
            aria-selected={value === t.value}
            aria-controls={`${panelId}-panel`}
            onClick={() => onChange(t.value)}
            onMouseEnter={() => moveTo(t.value)}
            onFocus={() => moveTo(t.value)}
            onBlur={() => moveTo(value)}
            className={cn('relative min-h-10 flex-1 rounded-full px-3 py-2 text-sm font-semibold transition-colors outline-none focus-visible:ring-2 focus-visible:ring-cuppi-brand-deep/60', value === t.value ? 'text-cuppi-ink' : 'text-cuppi-ink-soft hover:text-cuppi-ink')}
          >
            {t.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * The less-used boxes, tucked behind an "Advanced" link under a line. They slide open and closed. `inUse` says some of
 * them are set to something other than the default (a shared link, say), which opens them once so nothing hidden is
 * quietly changing the answer. `summary` is a small tag shown beside the link while it is closed.
 */
export function AdvancedSection({ inUse, summary, children }: { inUse: boolean; summary?: ReactNode; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (inUse) setOpen(true);
  }, [inUse]);
  // Once it has slid open, make sure the new boxes are in view (the boxes card scrolls inside itself on a short screen).
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => panelRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }), 320);
    return () => clearTimeout(t);
  }, [open]);
  return (
    <div className="border-t border-cuppi-line pt-4">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls={id}
        className="inline-flex items-center gap-1.5 rounded-md text-sm font-semibold text-cuppi-brand-deep underline-offset-4 outline-none transition-colors hover:underline focus-visible:ring-2 focus-visible:ring-cuppi-brand-deep/60"
      >
        Advanced
        <ChevronDown className={cn('h-4 w-4 transition-transform', open && 'rotate-180')} aria-hidden />
        {!open && summary && <span className="rounded-full bg-cuppi-honey-soft px-2 py-0.5 text-xs font-medium text-cuppi-ink-soft">{summary}</span>}
      </button>
      <div
        ref={panelRef}
        id={id}
        aria-hidden={!open}
        className={cn(
          'grid transition-[grid-template-rows,opacity,visibility] duration-300 [transition-timing-function:var(--ease-calm)] motion-reduce:transition-none',
          open ? 'grid-rows-[1fr] opacity-100' : 'invisible grid-rows-[0fr] opacity-0',
        )}
      >
        {/* A little room round the boxes so their focus rings are not clipped by the sliding edge. */}
        <div className="-mx-1 overflow-hidden px-1">
          <div className="space-y-5 pb-1 pt-4">{children}</div>
        </div>
      </div>
    </div>
  );
}

/** The headline answer: one big figure, a line about it, and a few smaller figures under it. */
export function HeadlineResult({ label, value, note, stats }: { label: string; value: string; note?: ReactNode; stats?: { label: string; value: string }[] }) {
  return (
    <section aria-live="polite" className="rounded-[2rem] bg-cuppi-honey-soft p-6 text-cuppi-ink sm:p-8">
      <p className="text-sm font-semibold text-cuppi-ink-soft">{label}</p>
      <p className="mt-1 font-headline text-5xl leading-none tracking-tight sm:text-6xl">
        <Roll>{value}</Roll>
      </p>
      {note && (
        <p className="mt-3 text-sm leading-relaxed text-cuppi-ink-soft">
          <Roll>{note}</Roll>
        </p>
      )}
      {stats && stats.length > 0 && (
        <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-4 border-t border-cuppi-line/70 pt-5">
          {stats.map((s) => (
            <div key={s.label}>
              <dt className="text-xs font-semibold text-cuppi-ink-soft">{s.label}</dt>
              <dd className="mt-0.5 text-lg font-semibold">
                <Roll>{s.value}</Roll>
              </dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  );
}

/** A white card for a table, chart or list under the headline. */
export function ResultCard({ title, children, className }: { title?: string; children: ReactNode; className?: string }) {
  return (
    <section className={cn('rounded-[2rem] border border-cuppi-line bg-cuppi-card p-5 sm:p-7', className)}>
      {title && <h3 className="mb-4 font-headline text-xl">{title}</h3>}
      {children}
    </section>
  );
}

/** What shows in place of the answer while the inputs are not usable yet. */
export function WaitingResult({ problems }: { problems: string[] }) {
  return (
    <section aria-live="polite" className="rounded-[2rem] bg-cuppi-honey-soft p-6 text-cuppi-ink sm:p-8">
      <p className="font-headline text-2xl">Fill in the boxes to see your answer</p>
      {problems.length > 0 && (
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-cuppi-ink-soft">
          {problems.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** A quiet note under a result: a warning or a thing worth knowing. */
export function Note({ children, tone = 'plain' }: { children: ReactNode; tone?: 'plain' | 'warn' }) {
  return (
    <p className={cn('rounded-2xl px-4 py-3 text-sm leading-relaxed', tone === 'warn' ? 'bg-cuppi-clay-soft text-cuppi-ink' : 'bg-cuppi-paper-deep text-cuppi-ink-soft')}>
      <Roll>{children}</Roll>
    </p>
  );
}

/** Copy the address (which carries the numbers) and start again. */
export function ToolActions({ changed, onReset, children }: { changed: boolean; onReset: () => void; children?: ReactNode }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // No clipboard permission: the address bar already has the link.
    }
  };
  return (
    <div className="flex flex-wrap gap-2 pt-1">
      <button type="button" onClick={copy} className="inline-flex items-center gap-2 rounded-full bg-cuppi-brand-fill px-4 py-2 text-sm font-semibold text-cuppi-cream transition-[filter] hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cuppi-brand-deep/60 focus-visible:ring-offset-2 focus-visible:ring-offset-cuppi-card">
        {copied ? <Check className="h-4 w-4" aria-hidden /> : <Link2 className="h-4 w-4" aria-hidden />}
        {copied ? 'Link copied' : 'Copy a link to this'}
      </button>
      {changed && (
        <button type="button" onClick={onReset} className="inline-flex items-center gap-2 rounded-full border border-cuppi-line bg-cuppi-paper px-4 py-2 text-sm font-medium transition-colors hover:bg-cuppi-honey-soft">
          <RotateCcw className="h-4 w-4" aria-hidden /> Start again
        </button>
      )}
      {children}
    </div>
  );
}

/** A simple table that scrolls sideways on a phone rather than squashing. */
export function DataTable({ head, rows, highlight, animated = true }: { head: string[]; rows: ReactNode[][]; highlight?: number; /** Digits roll when a figure changes. Off for very long tables, where it would be hundreds of moving digits. */ animated?: boolean }) {
  return (
    <div className="-mx-1 overflow-x-auto px-1">
      <table className="w-full min-w-[20rem] border-collapse text-sm">
        <thead>
          <tr className="border-b border-cuppi-line text-left text-xs font-semibold text-cuppi-ink-soft">
            {head.map((h, i) => (
              <th key={h} scope="col" className={cn('py-2 pr-3 font-semibold', i > 0 && 'text-right')}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, r) => (
            <tr key={r} className={cn('border-b border-cuppi-line/60 last:border-0', r === highlight && 'bg-cuppi-honey-soft/70 font-semibold')}>
              {row.map((cell, i) => (
                <td key={i} className={cn('py-2.5 pr-3', i > 0 && 'text-right tabular-nums')}>
                  {animated ? <Roll>{cell}</Roll> : cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

