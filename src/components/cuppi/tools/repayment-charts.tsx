'use client';

import { useId, useState } from 'react';
import { totalsSplit, yearlySummary, type Schedule } from '@/lib/tools/amortise';
import { niceStep, resampleBalance } from '@/lib/tools/chart';
import { gbp, share } from '@/lib/tools/format';
import { cn } from '@/lib/utils';
import { AnimatedText, Roll } from './animated-number';
import { useTweened } from './use-tween';

export type ChartSeries = {
  label: string;
  /** The debt after each month, starting at month 0 (see balanceSeries). */
  points: { month: number; balance: number }[];
  /** Which brand colour draws the line. */
  colour: SeriesColour;
};

/** The colours a line can be, in the order a comparison hands them out. Each one is spelled out in full so Tailwind can see it. */
export type SeriesColour = 'brand' | 'lake' | 'moss' | 'plum' | 'sky';
/** Orange, blue, green, plum, light blue: told apart by hue, in light and in dark. */
export const SERIES_COLOURS: SeriesColour[] = ['brand', 'lake', 'moss', 'plum', 'sky'];
export const STROKE: Record<SeriesColour, string> = { brand: 'stroke-cuppi-brand-deep', lake: 'stroke-cuppi-lake', moss: 'stroke-cuppi-moss', plum: 'stroke-[#c45fb0]', sky: 'stroke-cuppi-sky' };
export const DOT: Record<SeriesColour, string> = { brand: 'fill-cuppi-brand-deep', lake: 'fill-cuppi-lake', moss: 'fill-cuppi-moss', plum: 'fill-[#c45fb0]', sky: 'fill-cuppi-sky' };
export const SWATCH: Record<SeriesColour, string> = { brand: 'bg-cuppi-brand-deep', lake: 'bg-cuppi-lake', moss: 'bg-cuppi-moss', plum: 'bg-[#c45fb0]', sky: 'bg-cuppi-sky' };

const W = 640;
const H = 280;
const M = { top: 12, right: 14, bottom: 30, left: 58 };
const PLOT_W = W - M.left - M.right;
const PLOT_H = H - M.top - M.bottom;
const BASE = H - M.bottom;
/** How many points a line is drawn with. Always the same, so one line can glide into another. */
const SAMPLES = 121;

const compact = (n: number) => (n >= 1_000_000 ? `£${+(n / 1_000_000).toFixed(2)}m` : n >= 1000 ? `£${+(n / 1000).toFixed(1)}k` : `£${Math.round(n)}`);
const GLIDE = 'transition-transform duration-500 [transition-timing-function:cubic-bezier(0.22,0.8,0.3,1)] motion-reduce:transition-none';

/** The gridlines and money labels down the left. They glide to their new places when the scale changes. */
function YAxis({ yMax, step }: { yMax: number; step: number }) {
  const ticks: number[] = [];
  for (let v = 0; v <= yMax + 1e-9; v += step) ticks.push(v);
  return (
    <>
      {ticks.map((v, i) => (
        <g key={i} className={GLIDE} style={{ transform: `translateY(${BASE - (v / yMax) * PLOT_H}px)` }}>
          <line x1={M.left} x2={W - M.right} y1={0} y2={0} className="stroke-cuppi-line" strokeWidth={1} />
          <text x={M.left - 8} y={4} textAnchor="end" className="fill-cuppi-ink-soft" fontSize={11}>
            {compact(v)}
          </text>
        </g>
      ))}
    </>
  );
}

/** What you owe, month by month, as one or two lines. The lines glide when the numbers change. */
export function OwedView({ series, description, area: showArea = series.length <= 2 }: { series: ChartSeries[]; description: string; /** Shade under the first line. Off when many lines are compared. */ area?: boolean }) {
  const titleId = useId();
  const [hover, setHover] = useState<number | null>(null);
  const months = Math.max(1, ...series.flatMap((s) => s.points.map((p) => p.month)));
  const top = Math.max(1, ...series.flatMap((s) => s.points.map((p) => p.balance)));
  const step = niceStep(top, 4);
  const yMax = Math.ceil(top / step) * step;
  const y = (balance: number) => BASE - (balance / yMax) * PLOT_H;
  const x = (month: number) => M.left + (month / months) * PLOT_W;

  // Each line is SAMPLES heights in pixels, one after another; the glide moves every one of them.
  const target = series.flatMap((s) => resampleBalance(s.points, months, SAMPLES).map(y));
  const heights = useTweened(target);
  const line = (si: number) => heights.slice(si * SAMPLES, (si + 1) * SAMPLES);
  const px = (i: number) => M.left + (i / (SAMPLES - 1)) * PLOT_W;
  const path = (ys: number[]) => ys.map((v, i) => `${i ? 'L' : 'M'}${px(i).toFixed(1)},${v.toFixed(1)}`).join(' ');

  const years = months / 12;
  const yearStep = years <= 6 ? 1 : years <= 14 ? 2 : years <= 30 ? 5 : 10;
  const xTicks: number[] = [];
  for (let yr = 0; yr <= years + 1e-9; yr += yearStep) xTicks.push(yr);

  const stroke = STROKE;
  const dot = DOT;
  const swatch = SWATCH;
  const first = line(0);
  const area = `${path(first)} L${px(SAMPLES - 1).toFixed(1)},${BASE} L${px(0)},${BASE} Z`;

  const at = (clientX: number, rect: DOMRect) => {
    const m = Math.round(((((clientX - rect.left) / rect.width) * W - M.left) / PLOT_W) * months);
    setHover(Math.min(months, Math.max(0, m)));
  };
  const valueAt = (s: ChartSeries, month: number) => (s.points[Math.min(month, s.points.length - 1)] ?? { balance: 0 }).balance;
  const sampleAt = (month: number) => Math.round((month / months) * (SAMPLES - 1));

  return (
    <figure>
      <figcaption className="mb-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm">
        {series.map((s) => (
          <span key={s.label} className="inline-flex items-center gap-2">
            <span className={`h-2.5 w-5 rounded-full ${swatch[s.colour]}`} aria-hidden />
            {s.label}
            {hover !== null && <span className="font-semibold tabular-nums">{gbp(valueAt(s, hover))}</span>}
          </span>
        ))}
        <span className="text-xs text-cuppi-ink-soft">{hover !== null ? `After ${Math.floor(hover / 12)} years ${hover % 12} months` : 'Move over the chart to read it'}</span>
      </figcaption>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-labelledby={titleId}
        className="h-auto w-full touch-pan-y select-none"
        onPointerMove={(e) => at(e.clientX, e.currentTarget.getBoundingClientRect())}
        onPointerLeave={() => setHover(null)}
      >
        <title id={titleId}>{description}</title>
        <YAxis yMax={yMax} step={step} />
        {xTicks.map((yr, i) => (
          <g key={i} className={GLIDE} style={{ transform: `translateX(${x(yr * 12)}px)` }}>
            <text x={0} y={H - 8} textAnchor="middle" className="fill-cuppi-ink-soft" fontSize={11}>
              {yr === 0 ? 'Now' : `${yr}y`}
            </text>
          </g>
        ))}
        {showArea && <path d={area} className="fill-cuppi-brand-deep/10" />}
        {series.map((s, si) => ({ s, si })).reverse().map(({ s, si }) => (
          <path key={s.label} d={path(line(si))} fill="none" className={stroke[s.colour]} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
        ))}
        {hover !== null && (
          <g>
            <line x1={px(sampleAt(hover))} x2={px(sampleAt(hover))} y1={M.top} y2={BASE} className="stroke-cuppi-ink-soft" strokeDasharray="3 3" />
            {series.map((s, si) => (
              <circle key={s.label} cx={px(sampleAt(hover))} cy={line(si)[sampleAt(hover)]} r={4.5} className={dot[s.colour]} />
            ))}
          </g>
        )}
      </svg>
    </figure>
  );
}

const LAYERS = [
  { key: 'interest', label: 'Interest', fill: 'fill-cuppi-brand-deep', swatch: 'bg-cuppi-brand-deep' },
  { key: 'principal', label: 'Debt repaid', fill: 'fill-cuppi-lake', swatch: 'bg-cuppi-lake' },
  { key: 'overpayment', label: 'Extra payments', fill: 'fill-cuppi-moss', swatch: 'bg-cuppi-moss' },
] as const;

/** Where each year's money goes: interest at the bottom, the debt cleared above it, and any extra on top. The bars grow and shrink when the numbers change. */
function SplitView({ schedule, description }: { schedule: Schedule; description: string }) {
  const titleId = useId();
  const [hover, setHover] = useState<number | null>(null);
  const years = yearlySummary(schedule);
  const n = years.length;
  const hasExtra = years.some((y) => y.overpayment > 0.005);
  const layers = hasExtra ? LAYERS : LAYERS.slice(0, 2);

  const top = Math.max(1, ...years.map((y) => y.interest + y.principal + y.overpayment));
  const step = niceStep(top, 4);
  const yMax = Math.ceil(top / step) * step;
  const slot = PLOT_W / Math.max(1, n);
  const barW = Math.min(slot * 0.74, 36);

  // Each bar is three heights in pixels (interest, debt, extra); the glide moves every one of them. New bars grow from nothing.
  const target = years.flatMap((y) => [y.interest, y.principal, y.overpayment].map((v) => (v / yMax) * PLOT_H));
  const heights = useTweened(target, { grow: true });

  const yearStep = n <= 10 ? 1 : n <= 20 ? 2 : n <= 30 ? 5 : 10;
  const at = (clientX: number, rect: DOMRect) => {
    const i = Math.floor(((((clientX - rect.left) / rect.width) * W - M.left) / PLOT_W) * n);
    setHover(i >= 0 && i < n ? i : null);
  };
  const hovered = hover !== null ? years[hover] : null;

  return (
    <figure>
      <figcaption className="mb-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm">
        {layers.map((l) => (
          <span key={l.key} className="inline-flex items-center gap-2">
            <span className={cn('h-2.5 w-5 rounded-full', l.swatch)} aria-hidden />
            {l.label}
            {hovered && (
              <span className="font-semibold tabular-nums">
                <AnimatedText text={gbp(hovered[l.key])} />
              </span>
            )}
          </span>
        ))}
        <span className="text-xs text-cuppi-ink-soft">{hovered ? `In year ${hovered.year}` : 'Move over the chart to read a year'}</span>
      </figcaption>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-labelledby={titleId}
        className="h-auto w-full touch-pan-y select-none"
        onPointerMove={(e) => at(e.clientX, e.currentTarget.getBoundingClientRect())}
        onPointerLeave={() => setHover(null)}
      >
        <title id={titleId}>{description}</title>
        <YAxis yMax={yMax} step={step} />
        {years.map((y, i) => {
          const x = M.left + slot * i + (slot - barW) / 2;
          let bottom = BASE;
          return (
            <g key={y.year} className={cn('transition-opacity duration-200', hover !== null && hover !== i && 'opacity-50')}>
              {layers.map((l, k) => {
                const h = Math.max(0, heights[i * 3 + k] ?? 0);
                bottom -= h;
                return <rect key={l.key} x={x} y={bottom} width={barW} height={h} rx={1.5} className={l.fill} />;
              })}
              {((y.year % yearStep === 0 && n > 1) || y.year === 1) && (
                <text x={x + barW / 2} y={H - 8} textAnchor="middle" className="fill-cuppi-ink-soft" fontSize={11}>
                  {y.year}y
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </figure>
  );
}

/** A bar of everything you pay back, split into interest, debt and any extra, with the figures under it. The bar slides to its new split. */
function TotalSplit({ schedule }: { schedule: Schedule }) {
  const t = totalsSplit(schedule);
  if (!(t.total > 0)) return null;
  const parts = [
    { label: 'Interest', value: t.interest, bar: 'bg-cuppi-brand-deep', swatch: 'bg-cuppi-brand-deep' },
    { label: 'Debt repaid', value: t.principal, bar: 'bg-cuppi-lake', swatch: 'bg-cuppi-lake' },
    ...(t.extra > 0.005 ? [{ label: 'Extra payments', value: t.extra, bar: 'bg-cuppi-moss', swatch: 'bg-cuppi-moss' }] : []),
  ];
  return (
    <div className="mb-6">
      <p className="mb-3 leading-relaxed">
        Of the <b><Roll>{gbp(t.total)}</Roll></b> you pay back in all, <b><Roll>{share((t.interest / t.total) * 100)}</Roll></b> is interest.
      </p>
      <div role="img" aria-label={parts.map((p) => `${p.label} ${gbp(p.value)}`).join(', ')} className="flex h-4 gap-0.5 overflow-hidden rounded-full bg-cuppi-paper-deep">
        {parts.map((p) => (
          <div key={p.label} className={cn('h-full transition-[width] duration-700 [transition-timing-function:cubic-bezier(0.22,0.8,0.3,1)] motion-reduce:transition-none', p.bar)} style={{ width: `${(p.value / t.total) * 100}%` }} />
        ))}
      </div>
      <dl className="mt-3 flex flex-wrap gap-x-8 gap-y-2">
        {parts.map((p) => (
          <div key={p.label}>
            <dt className="flex items-center gap-2 text-xs font-semibold text-cuppi-ink-soft">
              <span className={cn('h-2.5 w-2.5 rounded-full', p.swatch)} aria-hidden /> {p.label}
            </dt>
            <dd className="mt-0.5 text-lg font-semibold tabular-nums">
              <Roll>{gbp(p.value)}</Roll>
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

/**
 * The charts under a repayment result, in two views: what you owe as time goes on (lines), and where your payments
 * go (how much of the money is interest and how much clears the debt, in total and year by year). Both glide to their
 * new shape when the numbers change.
 */
/** The row of buttons that switches a chart card between its views. */
export function ChartTabs<V extends string>({ tabs, value, onChange, panelId }: { tabs: readonly { value: V; label: string }[]; value: V; onChange: (v: V) => void; panelId: string }) {
  return (
    <div role="tablist" aria-label="Chart" className="mb-5 flex gap-1.5 rounded-2xl bg-cuppi-paper-deep p-1.5">
      {tabs.map((t) => (
        <button
          key={t.value}
          id={`${panelId}-${t.value}`}
          type="button"
          role="tab"
          aria-selected={value === t.value}
          aria-controls={`${panelId}-panel`}
          onClick={() => onChange(t.value)}
          className={cn(
            'min-h-10 flex-1 rounded-xl px-3 py-2 text-sm font-medium transition-colors',
            value === t.value ? 'bg-cuppi-card text-cuppi-ink' : 'text-cuppi-ink-soft hover:text-cuppi-ink',
          )}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

/**
 * The charts under a repayment result, in two views: what you owe as time goes on (lines), and where your payments
 * go (how much of the money is interest and how much clears the debt, in total and year by year). Both glide to their
 * new shape when the numbers change.
 */
export function RepaymentCharts({ series, schedule, description, first = 'split' }: { series: ChartSeries[]; schedule: Schedule; description: string; /** Which view shows first, and comes first in the tabs. */ first?: 'owed' | 'split' }) {
  const [view, setView] = useState<'owed' | 'split'>(first);
  const id = useId();
  const tabs = [
    { value: 'split', label: 'Where your payments go' },
    { value: 'owed', label: 'What you owe' },
  ] as const;
  return (
    <div>
      <ChartTabs
        tabs={first === 'split' ? tabs : [tabs[1], tabs[0]]}
        value={view}
        onChange={setView}
        panelId={id}
      />
      <div role="tabpanel" id={`${id}-panel`} aria-labelledby={`${id}-${view}`}>
        {view === 'owed' ? (
          <OwedView series={series} description={description} />
        ) : (
          <>
            <TotalSplit schedule={schedule} />
            <SplitView schedule={schedule} description={`A chart of each year's payments split into interest and debt repaid. ${description}`} />
          </>
        )}
      </div>
    </div>
  );
}
