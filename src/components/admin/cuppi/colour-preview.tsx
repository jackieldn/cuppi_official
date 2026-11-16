'use client';

import type { CSSProperties } from 'react';
import { previewVariables, type ColourOverrides, type Mode } from '@/lib/theme-colours';
import { cn } from '@/lib/utils';

/**
 * A small Cuppi page in one theme, painted with the colours being edited. It uses the site's own colour classes, and
 * gives itself the whole palette as inline variables (the page's light/dark switch cannot be used inside the admin),
 * so what it shows is what the site will look like. The layout is only a sketch: the point is each colour in use.
 */
export function ColourPreview({ mode, overrides, className }: { mode: Mode; overrides: ColourOverrides; className?: string }) {
  const style = { ...previewVariables(overrides, mode), colorScheme: mode } as CSSProperties;
  return (
    <div
      style={style}
      className={cn('theme-cuppi space-y-3 overflow-hidden rounded-xl border border-cuppi-line bg-cuppi-paper p-3 font-body text-cuppi-ink', className)}
      aria-label={`${mode === 'light' ? 'Light' : 'Dark'} preview`}
    >
      {/* The menu */}
      <div className="flex items-center gap-3 rounded-full border border-cuppi-line bg-cuppi-card px-3 py-1.5 text-xs">
        <span className="grid h-5 w-5 place-items-center rounded-md bg-cuppi-brand text-[0.6rem] font-bold text-cuppi-cream">C</span>
        <span className="rounded-full bg-cuppi-honey-soft px-2 py-0.5 font-medium">Features</span>
        <span>Cosy Corner</span>
        <span className="hidden sm:inline">FAQ</span>
        <span className="ml-auto rounded-full bg-cuppi-brand-fill px-3 py-1 font-semibold text-cuppi-cream">Download</span>
      </div>

      {/* A hero, in a soft tint */}
      <div className="rounded-2xl bg-cuppi-honey-soft p-4">
        <p className="font-headline text-2xl leading-tight">
          Calm, <em className="text-cuppi-brand">gently</em> handled
        </p>
        <p className="mt-1 text-xs text-cuppi-ink-soft">Save it once and Cuppi reminds you, calmly.</p>
        <p className="mt-2 text-xs font-semibold text-cuppi-brand-deep">See every feature →</p>
      </div>

      {/* The colour blocks */}
      <div className="grid grid-cols-4 gap-2 text-center text-[0.65rem] font-semibold">
        <div className="rounded-xl bg-cuppi-lake px-1 py-3 text-cuppi-cream">Lake</div>
        <div className="rounded-xl bg-cuppi-sky px-1 py-3 text-cuppi-espresso">Sky</div>
        <div className="rounded-xl bg-cuppi-moss-deep px-1 py-3 text-cuppi-cream">Moss</div>
        <div className="rounded-xl bg-cuppi-honey px-1 py-3 text-cuppi-espresso">Honey</div>
      </div>

      {/* The soft tints, with ordinary text on them */}
      <div className="grid grid-cols-4 gap-2 text-center text-[0.65rem]">
        <div className="rounded-xl bg-cuppi-honey-soft px-1 py-2">Honey</div>
        <div className="rounded-xl bg-cuppi-sky-soft px-1 py-2">Sky</div>
        <div className="rounded-xl bg-cuppi-moss-soft px-1 py-2">Moss</div>
        <div className="rounded-xl bg-cuppi-clay-soft px-1 py-2">Clay</div>
      </div>

      {/* A card, with a shadow and a border */}
      <div className="rounded-2xl border border-cuppi-line bg-cuppi-card p-3 shadow-[0_12px_30px_-16px_rgb(var(--c-shadow)/0.5)]">
        <p className="font-headline text-lg leading-tight">A card on the page</p>
        <p className="mt-1 text-xs text-cuppi-ink-soft">Quiet text sits a step back from the main text.</p>
        <p className="mt-2 text-xs">
          Some{' '}
          <span className="rounded px-0.5" style={{ backgroundColor: 'rgb(var(--c-selection) / 0.4)' }}>
            highlighted
          </span>{' '}
          words.
        </p>
      </div>

      {/* The footer */}
      <div className="rounded-xl bg-cuppi-paper-deep px-3 py-2 text-[0.65rem] text-cuppi-ink-soft">Footer and sunken areas</div>
    </div>
  );
}
