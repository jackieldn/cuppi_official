'use client';

import { useId } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { MAX_SCENARIOS } from '@/lib/tools/scenario-params';
import { cn } from '@/lib/utils';
import { SERIES_COLOURS, SWATCH } from './repayment-charts';

/** The colour that stands for scenario number `index` (from 0), in the bar, the table and the charts. */
export const scenarioColour = (index: number) => SERIES_COLOURS[index % SERIES_COLOURS.length];

/**
 * Sits at the top of a calculator's boxes: a button for each scenario (you start with one), to pick which one the boxes
 * are editing, and a button to add another to compare it with. With more than one, the selected one can be renamed or removed.
 */
export function ScenarioBar({
  names,
  active,
  onSelect,
  onAdd,
  onRemove,
  onRename,
  noun,
}: {
  names: string[];
  active: number;
  onSelect: (index: number) => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
  onRename: (index: number, name: string) => void;
  /** What a scenario is called here ("deal", "plan", "loan"), for the button and hint. */
  noun: string;
}) {
  const id = useId();
  const count = names.length;
  return (
    <div className="space-y-3 border-b border-cuppi-line pb-5">
      <div role="tablist" aria-label="Scenarios" className="flex flex-wrap items-center gap-2">
        {names.map((name, i) => (
          <button
            key={i}
            type="button"
            role="tab"
            aria-selected={i === active}
            onClick={() => onSelect(i)}
            className={cn(
              'inline-flex min-h-10 max-w-full items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-colors',
              i === active ? 'border-cuppi-ink bg-cuppi-paper text-cuppi-ink' : 'border-cuppi-line text-cuppi-ink-soft hover:border-cuppi-ink-soft hover:text-cuppi-ink',
            )}
          >
            <span className={cn('h-3 w-3 shrink-0 rounded-full', SWATCH[scenarioColour(i)])} aria-hidden />
            <span className="truncate">{name}</span>
          </button>
        ))}
        {count < MAX_SCENARIOS && (
          <button
            type="button"
            onClick={onAdd}
            className="inline-flex min-h-10 items-center gap-2 rounded-full border border-dashed border-cuppi-ink-soft/60 px-4 py-2 text-sm font-semibold text-cuppi-brand-deep transition-colors hover:border-cuppi-brand-deep hover:bg-cuppi-honey-soft"
          >
            <Plus className="h-4 w-4" aria-hidden /> {count === 1 ? `Compare with another ${noun}` : `Add a ${noun}`}
          </button>
        )}
      </div>
      {count === 1 ? (
        <p className="text-xs leading-relaxed text-cuppi-ink-soft">Add up to {MAX_SCENARIOS - 1} more to compare them side by side. Each starts as a copy of the one you are on.</p>
      ) : (
        <div className="flex items-center gap-2">
          <label htmlFor={id} className="sr-only">
            Name of the selected {noun}
          </label>
          <input
            id={id}
            value={names[active]}
            maxLength={24}
            onChange={(e) => onRename(active, e.target.value)}
            className="min-w-0 flex-1 rounded-lg border border-cuppi-line bg-cuppi-paper px-3 py-1.5 text-sm font-medium outline-none ring-cuppi-brand-deep/60 focus:ring-2"
          />
          <button type="button" onClick={() => onRemove(active)} aria-label={`Remove ${names[active]}`} title={`Remove this ${noun}`} className="grid h-9 w-9 place-items-center rounded-full text-cuppi-ink-soft transition-colors hover:bg-cuppi-honey-soft hover:text-cuppi-ink">
            <Trash2 className="h-4 w-4" aria-hidden />
          </button>
        </div>
      )}
    </div>
  );
}

/** A line above the answer saying which scenario it is for, once there is more than one. */
export function ScenarioTag({ index, name }: { index: number; name: string }) {
  return (
    <p className="flex items-center gap-2 px-2 text-sm font-semibold text-cuppi-ink-soft">
      <span className={cn('h-3 w-3 rounded-full', SWATCH[scenarioColour(index)])} aria-hidden /> Showing {name}
    </p>
  );
}
