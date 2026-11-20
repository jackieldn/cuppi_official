'use client';

import { X } from 'lucide-react';
import type { Source } from '@/lib/compare-data';

/**
 * The sources behind a claim: the ones chosen, as chips that can be removed, and a list to add another from. A source that has
 * since been deleted shows in red so it can be taken out (saving is refused until it is).
 */
export function SourcePicker({ label, value, sources, onChange }: { label: string; value: string[]; sources: Source[]; onChange: (ids: string[]) => void }) {
  const known = new Map(sources.map((s) => [s.id, s]));
  const free = sources.filter((s) => !value.includes(s.id));
  return (
    <div className="space-y-1.5">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <div className="flex flex-wrap items-center gap-1.5">
        {value.length === 0 && <span className="text-xs text-muted-foreground">None yet</span>}
        {value.map((id) => {
          const s = known.get(id);
          return (
            <span key={id} className={`inline-flex max-w-full items-center gap-1 rounded-full border px-2 py-0.5 text-xs ${s ? 'bg-muted' : 'border-destructive text-destructive'}`}>
              <span className="truncate">{s ? s.label : `${id} (missing)`}</span>
              <button type="button" aria-label={`Remove source ${s?.label ?? id}`} onClick={() => onChange(value.filter((v) => v !== id))}>
                <X className="h-3 w-3" />
              </button>
            </span>
          );
        })}
        {free.length > 0 && (
          <select
            aria-label={`Add a source to ${label}`}
            className="h-7 max-w-[14rem] rounded-md border bg-background px-1.5 text-xs"
            value=""
            onChange={(e) => e.target.value && onChange([...value, e.target.value])}
          >
            <option value="">Add a source…</option>
            {free.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        )}
      </div>
    </div>
  );
}
