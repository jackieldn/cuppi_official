'use client';

import { useState, type ReactNode } from 'react';
import { Check, Link2, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Roll } from './animated-number';

/** The calculator's frame: the inputs on one side, the answer on the other (stacked on a phone). */
export function CalculatorFrame({ inputs, results, below }: { inputs: ReactNode; results: ReactNode; /** Full width under both: the comparison, once there is one. */ below?: ReactNode }) {
  return (
    <div className="space-y-5">
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
        <div className="space-y-5 rounded-[2rem] border border-cuppi-line bg-cuppi-card p-5 sm:p-7">{inputs}</div>
        <div className="space-y-5">{results}</div>
      </div>
      {below}
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
      <button type="button" onClick={copy} className="inline-flex items-center gap-2 rounded-full border border-cuppi-line bg-cuppi-paper px-4 py-2 text-sm font-medium transition-colors hover:bg-cuppi-honey-soft">
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

