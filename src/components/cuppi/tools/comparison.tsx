'use client';

import { useId, useState, type ReactNode } from 'react';
import { Check } from 'lucide-react';
import { bestIndexes } from '@/lib/tools/best';
import { cn } from '@/lib/utils';
import { Roll } from './animated-number';
import { ResultCard } from './parts';
import { ChartTabs, OwedView, SWATCH, type ChartSeries } from './repayment-charts';
import { scenarioColour } from './scenario-bar';

/** The colours the parts of a cost bar wear, the same everywhere. */
export const BAR = { debt: 'bg-cuppi-lake', interest: 'bg-cuppi-brand-deep', fee: 'bg-cuppi-honey', extra: 'bg-cuppi-moss' } as const;

/** "Deal B costs the least over the first 5 years: £1,234 less in interest and fees than Deal A." */
export function cheapestSentence<R>(columns: Column<R>[], cost: (r: R) => number, scope: string, money: (n: number) => string): string | undefined {
  if (columns.length < 2) return undefined;
  const costs = columns.map((c) => cost(c.result));
  const low = costs.indexOf(Math.min(...costs));
  const high = costs.indexOf(Math.max(...costs));
  const gap = costs[high] - costs[low];
  if (gap < 0.5) return `They cost the same ${scope}.`;
  return `${columns[low].name} costs the least ${scope}: ${money(gap)} less in interest and fees than ${columns[high].name}.`;
}

export type Column<R> = { index: number; name: string; result: R };

export type CompareRow<R> = {
  label: string;
  /** What to show for each scenario. */
  text: (r: R) => string;
  /** The number the best is chosen from. Leave out to pick no best (for rows that are only information). */
  value?: (r: R) => number;
  /** Whether the best is the lowest (the default) or the highest. */
  best?: 'lowest' | 'highest';
  /** Under each that is not the best, show how far it is from it. `money` formats the gap. */
  gap?: (n: number) => string;
  /** Skip the row when it would say nothing. */
  skip?: (rs: R[]) => boolean;
};

/**
 * The comparison under a calculator, once there are two or more scenarios: a sentence about the result, a table with a
 * column for each (the best in each row ticked, and a click on a name selects it), and whatever charts the calculator
 * brings. `notShown` names scenarios whose boxes are not usable yet.
 */
export function ComparisonSection<R>({
  summary,
  controls,
  columns,
  rows,
  active,
  onSelect,
  notShown,
  footnote,
  children,
}: {
  summary?: string;
  controls?: ReactNode;
  columns: Column<R>[];
  rows: CompareRow<R>[];
  active: number;
  onSelect: (index: number) => void;
  notShown: string[];
  footnote?: string;
  children?: ReactNode;
}) {
  const rs = columns.map((c) => c.result);
  const shown = rows.filter((r) => !r.skip?.(rs));
  return (
    <section aria-label="Comparison" className="space-y-5">
      <div className="rounded-[2rem] bg-cuppi-sky-soft p-6 text-cuppi-ink sm:p-8">
        <h3 className="font-headline text-2xl">Your scenarios side by side</h3>
        {summary && (
          <p aria-live="polite" className="mt-2 text-lg leading-relaxed">
            <Roll>{summary}</Roll>
          </p>
        )}
        {controls && <div className="mt-5 max-w-sm">{controls}</div>}
      </div>

      {notShown.length > 0 && (
        <p className="rounded-2xl bg-cuppi-clay-soft px-4 py-3 text-sm">
          Not shown: {notShown.join(', ')}. {notShown.length === 1 ? 'Its' : 'Their'} boxes are empty or not right yet.
        </p>
      )}

      {columns.length > 0 && (
        <ResultCard title="Side by side">
          <div className="-mx-1 overflow-x-auto px-1">
            <table className="w-full min-w-[32rem] border-collapse text-sm">
              <thead>
                <tr className="border-b border-cuppi-line text-left">
                  <th scope="col" className="sticky left-0 z-10 bg-cuppi-card py-2 pr-3" />
                  {columns.map((c) => (
                    <th key={c.index} scope="col" className="min-w-[7.5rem] py-1 pr-3 text-right font-semibold">
                      <button type="button" onClick={() => onSelect(c.index)} aria-pressed={c.index === active} title="Show this one in full" className={cn('inline-flex items-center gap-2 rounded-full px-2.5 py-1.5 transition-colors hover:bg-cuppi-honey-soft', c.index === active && 'bg-cuppi-paper-deep')}>
                        <span className={cn('h-3 w-3 rounded-full', SWATCH[scenarioColour(c.index)])} aria-hidden />
                        {c.name}
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {shown.map((row) => {
                  const mode = row.best ?? 'lowest';
                  const values = row.value ? rs.map(row.value) : [];
                  const best = row.value ? bestIndexes(values, mode) : new Set<number>();
                  const target = values.length ? (mode === 'lowest' ? Math.min(...values) : Math.max(...values)) : 0;
                  return (
                    <tr key={row.label} className="border-b border-cuppi-line/60 last:border-0">
                      <th scope="row" className="sticky left-0 z-10 bg-cuppi-card py-3 pr-3 text-left font-medium text-cuppi-ink-soft">
                        {row.label}
                      </th>
                      {rs.map((r, n) => {
                        const isBest = best.has(n);
                        const gap = row.gap && row.value && !isBest && rs.length > 1 ? Math.abs(values[n] - target) : 0;
                        return (
                          <td key={n} className={cn('py-3 pr-3 text-right tabular-nums', isBest && 'rounded-lg bg-cuppi-moss-soft font-semibold')}>
                            <span className="inline-flex items-center gap-1.5">
                              {isBest && <Check className="h-3.5 w-3.5 text-cuppi-moss-deep" aria-label="Best" />}
                              {/* A span of its own: the digits are inline pieces, and a flex parent would space each one out. */}
                              <span>
                                <Roll>{row.text(r)}</Roll>
                              </span>
                            </span>
                            {gap > 0.5 && row.gap && (
                              <span className="block text-xs font-normal text-cuppi-ink-soft">
                                <Roll>{`${mode === 'lowest' ? '+' : '−'}${row.gap(gap)}`}</Roll>
                              </span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-cuppi-ink-soft">{footnote ?? 'The tick marks the best in each row, and the small figure is how far each of the others is from it.'}</p>
        </ResultCard>
      )}
      {children}
    </section>
  );
}

// ---------- charts for a comparison ----------

export type BarItem = {
  index: number;
  name: string;
  /** The number the bar's length is measured by, and how to show it. */
  total: number;
  totalText: string;
  parts: { label: string; value: number; bar: string }[];
  caption?: string;
};

/** One bar per scenario on a common scale, each split into parts. The bars slide to their new lengths when the numbers change. */
export function StackedBars({ items }: { items: BarItem[] }) {
  const max = Math.max(1, ...items.map((x) => x.total));
  const legend = new Map<string, string>();
  for (const x of items) for (const p of x.parts) if (p.value > 0 && !legend.has(p.label)) legend.set(p.label, p.bar);
  return (
    <div>
      {legend.size > 1 && (
        <p className="mb-4 flex flex-wrap gap-x-5 gap-y-1 text-sm">
          {[...legend].map(([label, bar]) => (
            <span key={label} className="inline-flex items-center gap-2">
              <span className={cn('h-2.5 w-5 rounded-full', bar)} aria-hidden /> {label}
            </span>
          ))}
        </p>
      )}
      <ul className="space-y-4">
        {items.map((x) => (
          <li key={x.index}>
            <div className="mb-1.5 flex items-baseline justify-between gap-3">
              <span className="inline-flex items-center gap-2 font-medium">
                <span className={cn('h-3 w-3 rounded-full', SWATCH[scenarioColour(x.index)])} aria-hidden /> {x.name}
              </span>
              <span className="font-semibold tabular-nums">
                <Roll>{x.totalText}</Roll>
              </span>
            </div>
            <div
              role="img"
              aria-label={`${x.name}: ${x.totalText}`}
              className="flex h-5 gap-0.5 overflow-hidden rounded-full bg-cuppi-paper-deep"
              style={{ width: `${Math.max(2, (x.total / max) * 100)}%`, transition: 'width 700ms cubic-bezier(0.22,0.8,0.3,1)' }}
            >
              {x.parts.map((p) => (
                <div key={p.label} className={cn('h-full transition-[width] duration-700 motion-reduce:transition-none', p.bar)} style={{ width: `${x.total > 0 ? (p.value / x.total) * 100 : 0}%` }} />
              ))}
            </div>
            {x.caption && (
              <p className="mt-1 text-xs tabular-nums text-cuppi-ink-soft">
                <Roll>{x.caption}</Roll>
              </p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** One plain bar per scenario, in its own colour, for a single figure. */
export function MetricBars({ items }: { items: { index: number; name: string; value: number; text: string }[] }) {
  return <StackedBars items={items.map((x) => ({ index: x.index, name: x.name, total: x.value, totalText: x.text, parts: [{ label: x.name, value: x.value, bar: SWATCH[scenarioColour(x.index)] }] }))} />;
}

/** The debt of each scenario as lines over time, with an optional second view of where each one's money goes. */
export function ComparisonCharts({ title = 'See the difference', series, description, bars, barsLabel = 'Where the money goes' }: { title?: string; series: ChartSeries[]; description: string; bars?: BarItem[]; barsLabel?: string }) {
  const [view, setView] = useState<'owed' | 'bars'>('owed');
  const id = useId();
  const hasLines = series.length > 0;
  const hasBars = !!bars && bars.length > 0;
  if (!hasLines && !hasBars) return null;
  const current = hasLines && (view === 'owed' || !hasBars) ? 'owed' : 'bars';
  return (
    <ResultCard title={title}>
      {hasLines && hasBars && (
        <ChartTabs
          tabs={[
            { value: 'owed', label: 'What you owe' },
            { value: 'bars', label: barsLabel },
          ]}
          value={current}
          onChange={setView}
          panelId={id}
        />
      )}
      <div role={hasLines && hasBars ? 'tabpanel' : undefined} id={`${id}-panel`} aria-labelledby={hasLines && hasBars ? `${id}-${current}` : undefined}>
        {current === 'owed' ? <OwedView series={series} area={false} description={description} /> : <StackedBars items={bars!} />}
      </div>
    </ResultCard>
  );
}
