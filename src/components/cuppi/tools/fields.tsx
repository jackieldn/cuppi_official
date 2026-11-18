'use client';

import { useId, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { tidyNumberText } from '@/lib/tools/format';
import { Roll } from './animated-number';

/** One labelled box for a number. The person types text (so "£250,000" works); the calculator reads it with parseNumber. */
export function NumberField({
  label,
  value,
  onChange,
  prefix,
  suffix,
  hint,
  error,
  money,
  placeholder,
  className,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  prefix?: string;
  suffix?: string;
  hint?: ReactNode;
  error?: string | null;
  /** Add thousands commas when the box loses focus. */
  money?: boolean;
  placeholder?: string;
  className?: string;
}) {
  const id = useId();
  const describedBy = [hint ? `${id}-hint` : '', error ? `${id}-error` : ''].filter(Boolean).join(' ') || undefined;
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-cuppi-ink">
        {label}
      </label>
      <div
        className={cn(
          'flex items-center rounded-xl border bg-cuppi-paper px-3.5 transition-shadow focus-within:ring-2 focus-within:ring-cuppi-brand-deep/60',
          error ? 'border-cuppi-brand-deep' : 'border-cuppi-line',
        )}
      >
        {prefix && <span className="mr-1.5 text-cuppi-ink-soft">{prefix}</span>}
        <input
          id={id}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          spellCheck={false}
          value={value}
          placeholder={placeholder}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          onChange={(e) => onChange(e.target.value)}
          onBlur={() => money && onChange(tidyNumberText(value))}
          className="min-w-0 flex-1 bg-transparent py-3 text-base text-cuppi-ink outline-none placeholder:text-cuppi-ink-soft/60"
        />
        {suffix && <span className="ml-1.5 text-cuppi-ink-soft">{suffix}</span>}
      </div>
      {hint && !error && (
        <p id={`${id}-hint`} className="mt-1.5 text-xs leading-relaxed text-cuppi-ink-soft">
          <Roll>{hint}</Roll>
        </p>
      )}
      {error && (
        <p id={`${id}-error`} role="alert" className="mt-1.5 text-xs font-medium leading-relaxed text-cuppi-brand-deep">
          {error}
        </p>
      )}
    </div>
  );
}

/** A choice of a few, shown as a row of buttons. */
export function Segmented<V extends string>({
  label,
  value,
  options,
  onChange,
  className,
  hideLabel,
}: {
  label: string;
  value: V;
  options: { value: V; label: string }[];
  onChange: (value: V) => void;
  className?: string;
  /** Keep the label for screen readers but do not show it. */
  hideLabel?: boolean;
}) {
  const id = useId();
  return (
    <div className={className}>
      <span id={id} className={hideLabel ? 'sr-only' : 'mb-1.5 block text-sm font-semibold text-cuppi-ink'}>
        {label}
      </span>
      <div role="radiogroup" aria-labelledby={id} className="flex flex-wrap gap-1.5 rounded-2xl bg-cuppi-paper-deep p-1.5">
        {options.map((o) => {
          const on = o.value === value;
          return (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => onChange(o.value)}
              className={cn(
                'min-h-10 flex-1 rounded-xl px-3 py-2 text-sm font-medium transition-colors',
                on ? 'bg-cuppi-card text-cuppi-ink' : 'text-cuppi-ink-soft hover:text-cuppi-ink',
              )}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** A tick box with a sentence beside it. */
export function CheckField({ label, checked, onChange, hint }: { label: string; checked: boolean; onChange: (checked: boolean) => void; hint?: string }) {
  const id = useId();
  return (
    <div className="flex items-start gap-3">
      <input id={id} type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-1 h-5 w-5 shrink-0 accent-[rgb(var(--c-brand-deep))]" />
      <label htmlFor={id} className="text-sm text-cuppi-ink">
        <span className="font-semibold">{label}</span>
        {hint && <span className="mt-0.5 block text-xs text-cuppi-ink-soft">{hint}</span>}
      </label>
    </div>
  );
}

/**
 * A scale to drag along, in steps. The chosen value shows beside the label; the whole numbers are marked underneath.
 * It is a real range input, so arrow keys, Home and End work, and the value is read out. `value` is text, like every
 * other box, and is moved to the nearest step.
 */
export function SliderField({
  label,
  value,
  onChange,
  min,
  max,
  step,
  format,
  hint,
}: {
  label: string;
  value: number;
  onChange: (value: string) => void;
  min: number;
  max: number;
  step: number;
  format: (n: number) => string;
  hint?: ReactNode;
}) {
  const id = useId();
  const pct = ((value - min) / (max - min)) * 100;
  // The thumb is 24px wide, so a mark at x% sits at x% of the track less the thumb's width.
  const at = (n: number) => `calc(12px + (100% - 24px) * ${(n - min) / (max - min)})`;
  const marks: number[] = [];
  for (let n = min; n <= max + 1e-9; n += 1) marks.push(n);
  const ticks: number[] = [];
  for (let n = min; n <= max + 1e-9; n += step) ticks.push(+n.toFixed(4));
  return (
    <div>
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-sm font-semibold text-cuppi-ink">
          {label}
        </label>
        <span className="text-xl font-semibold leading-none tabular-nums text-cuppi-ink" aria-hidden>
          <Roll>{format(value)}</Roll>
        </span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-valuetext={format(value)}
        aria-describedby={hint ? `${id}-hint` : undefined}
        style={{ ['--pct' as string]: `calc(12px + (100% - 24px) * ${pct / 100})` }}
        className={cn(
          'block h-2 w-full cursor-pointer appearance-none rounded-full outline-none',
          'bg-[linear-gradient(to_right,rgb(var(--c-brand-fill))_var(--pct),rgb(var(--c-paper-deep))_var(--pct))]',
          '[&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-0 [&::-webkit-slider-thumb]:bg-cuppi-card [&::-webkit-slider-thumb]:shadow-[inset_0_0_0_3px_rgb(var(--c-brand-fill)),0_1px_4px_rgb(var(--c-shadow)/0.3)] [&::-webkit-slider-thumb]:transition-transform active:[&::-webkit-slider-thumb]:scale-110',
          '[&::-moz-range-thumb]:h-6 [&::-moz-range-thumb]:w-6 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-cuppi-card [&::-moz-range-thumb]:shadow-[inset_0_0_0_3px_rgb(var(--c-brand-fill))]',
          'focus-visible:[&::-webkit-slider-thumb]:ring-2 focus-visible:[&::-webkit-slider-thumb]:ring-cuppi-brand-deep/60 focus-visible:[&::-webkit-slider-thumb]:ring-offset-2',
        )}
      />
      <div className="relative mt-2 h-8 text-xs text-cuppi-ink-soft" aria-hidden>
        {ticks.map((n) => (
          <span key={n} className="absolute top-0 h-1.5 w-px -translate-x-1/2 bg-cuppi-line" style={{ left: at(n) }} />
        ))}
        {marks.map((n) => (
          <span key={n} className={cn('absolute top-2.5 -translate-x-1/2 tabular-nums', n === Math.round(value) && value === Math.round(value) && 'font-semibold text-cuppi-ink')} style={{ left: at(n) }}>
            {format(n)}
          </span>
        ))}
      </div>
      {hint && (
        <p id={`${id}-hint`} className="mt-1 text-xs leading-relaxed text-cuppi-ink-soft">
          {hint}
        </p>
      )}
    </div>
  );
}
