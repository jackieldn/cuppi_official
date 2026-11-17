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
}: {
  label: string;
  value: V;
  options: { value: V; label: string }[];
  onChange: (value: V) => void;
  className?: string;
}) {
  const id = useId();
  return (
    <div className={className}>
      <span id={id} className="mb-1.5 block text-sm font-semibold text-cuppi-ink">
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
                on ? 'bg-cuppi-card text-cuppi-ink shadow-[0_1px_3px_rgb(var(--c-shadow)/0.18)]' : 'text-cuppi-ink-soft hover:text-cuppi-ink',
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
