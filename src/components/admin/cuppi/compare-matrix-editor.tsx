'use client';

import { useState } from 'react';
import { ArrowDown, ArrowUp, ChevronDown, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { APP_IDS, APP_NAMES, COMPARE_LIMITS as L, RIVALS, type AppId, type Cell, type FactGroup, type FactRow, type Source } from '@/lib/compare-data';
import { Field } from './section-fields';
import { SourcePicker } from './compare-source-picker';

const KINDS: { value: Cell['kind']; label: string }[] = [
  { value: 'yes', label: 'Tick' },
  { value: 'no', label: 'Dash (not found)' },
  { value: 'text', label: 'Words' },
  { value: 'tbc', label: 'To confirm' },
];
const KIND_SHORT: Record<Cell['kind'], string> = { yes: 'Tick', no: 'Dash', text: 'Words', tbc: 'To confirm' };

function uniqueId(prefix: string, used: Set<string>): string {
  let n = 1;
  while (used.has(`${prefix}-${n}`)) n++;
  return `${prefix}-${n}`;
}

function CellField({ app, cell, onChange }: { app: AppId; cell: Cell; onChange: (c: Cell) => void }) {
  const setKind = (kind: Cell['kind']) => {
    const keep = kind === 'no' ? undefined : cell.text;
    onChange({ kind, ...(keep ? { text: keep } : {}), ...(kind === 'text' && cell.good ? { good: true } : {}) });
  };
  return (
    <div className="space-y-2 rounded-lg border bg-background p-3">
      <Label className="text-sm font-semibold">{APP_NAMES[app]}</Label>
      <select aria-label={`${APP_NAMES[app]} cell type`} className="h-9 w-full rounded-md border bg-background px-2 text-sm" value={cell.kind} onChange={(e) => setKind(e.target.value as Cell['kind'])}>
        {KINDS.map((k) => (
          <option key={k.value} value={k.value}>
            {k.label}
          </option>
        ))}
      </select>
      {cell.kind !== 'no' && (
        <Input
          aria-label={`${APP_NAMES[app]} cell words`}
          value={cell.text ?? ''}
          maxLength={L.line}
          placeholder={cell.kind === 'text' ? 'What it says' : 'A small note (optional), such as Premium only'}
          onChange={(e) => onChange({ ...cell, text: e.target.value })}
        />
      )}
      {cell.kind === 'text' && (
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          <Checkbox checked={!!cell.good} onCheckedChange={(v) => onChange({ ...cell, good: v === true })} />
          Good news: highlight it like a tick
        </label>
      )}
    </div>
  );
}

/**
 * The feature matrix: groups, and in each the rows. A row says what it is and what Cuppi does, then what each app has: a tick,
 * a dash, some words or "to confirm", with the sources behind each rival's cell.
 */
export function MatrixEditor({ groups, sources, onChange }: { groups: FactGroup[]; sources: Source[]; onChange: (groups: FactGroup[]) => void }) {
  const [openRow, setOpenRow] = useState<string | null>(null);
  const allRowIds = new Set(groups.flatMap((g) => g.rows.map((r) => r.id)));
  const rowCount = allRowIds.size;

  const patchGroup = (gi: number, change: Partial<FactGroup>) => onChange(groups.map((g, i) => (i === gi ? { ...g, ...change } : g)));
  const patchRow = (gi: number, ri: number, change: Partial<FactRow>) => patchGroup(gi, { rows: groups[gi].rows.map((r, i) => (i === ri ? { ...r, ...change } : r)) });
  const moveRow = (gi: number, ri: number, by: -1 | 1) => {
    const rows = [...groups[gi].rows];
    [rows[ri], rows[ri + by]] = [rows[ri + by], rows[ri]];
    patchGroup(gi, { rows });
  };
  const moveGroup = (gi: number, by: -1 | 1) => {
    const next = [...groups];
    [next[gi], next[gi + by]] = [next[gi + by], next[gi]];
    onChange(next);
  };
  const addRow = (gi: number) => {
    const id = uniqueId('row', allRowIds);
    const blank = (): Cell => ({ kind: 'tbc' });
    patchGroup(gi, { rows: [...groups[gi].rows, { id, label: '', cells: { cuppi: { kind: 'yes' }, hartley: blank(), familywall: blank() }, sources: { hartley: [], familywall: [] } }] });
    setOpenRow(id);
  };
  const addGroup = () => onChange([...groups, { id: uniqueId('group', new Set(groups.map((g) => g.id))), title: '', rows: [] }]);

  return (
    <div className="space-y-4">
      {groups.map((g, gi) => (
        <div key={g.id} className="rounded-xl border">
          <div className="flex items-center gap-2 border-b bg-muted/30 p-2">
            <div className="flex flex-col">
              <Button type="button" variant="ghost" size="icon" className="h-6 w-6" aria-label={`Move group ${g.title || gi + 1} up`} disabled={gi === 0} onClick={() => moveGroup(gi, -1)}>
                <ArrowUp className="h-4 w-4" />
              </Button>
              <Button type="button" variant="ghost" size="icon" className="h-6 w-6" aria-label={`Move group ${g.title || gi + 1} down`} disabled={gi === groups.length - 1} onClick={() => moveGroup(gi, 1)}>
                <ArrowDown className="h-4 w-4" />
              </Button>
            </div>
            <Input aria-label="Group title" value={g.title} maxLength={L.short} placeholder="Group title" className="font-medium" onChange={(e) => patchGroup(gi, { title: e.target.value })} />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0 text-destructive hover:text-destructive"
              aria-label={`Remove group ${g.title || gi + 1}`}
              onClick={() => {
                if (window.confirm(`Remove the group "${g.title || 'untitled'}" and its ${g.rows.length} rows? Snapshots for those rows will need removing too.`)) onChange(groups.filter((_, i) => i !== gi));
              }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>

          <div className="space-y-2 p-2">
            {g.rows.map((row, ri) => {
              const open = openRow === row.id;
              return (
                <div key={row.id} className="rounded-lg border">
                  <div className="flex items-center gap-2 p-2">
                    <div className="flex flex-col">
                      <Button type="button" variant="ghost" size="icon" className="h-5 w-6" aria-label={`Move ${row.label || 'row'} up`} disabled={ri === 0} onClick={() => moveRow(gi, ri, -1)}>
                        <ArrowUp className="h-3.5 w-3.5" />
                      </Button>
                      <Button type="button" variant="ghost" size="icon" className="h-5 w-6" aria-label={`Move ${row.label || 'row'} down`} disabled={ri === g.rows.length - 1} onClick={() => moveRow(gi, ri, 1)}>
                        <ArrowDown className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <button type="button" aria-expanded={open} onClick={() => setOpenRow(open ? null : row.id)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{row.label || 'Untitled row'}</span>
                        <span className="block truncate text-xs text-muted-foreground">{APP_IDS.map((a) => `${APP_NAMES[a]}: ${KIND_SHORT[row.cells[a].kind]}`).join(' · ')}</span>
                      </span>
                      <ChevronDown className={cn('h-4 w-4 shrink-0 text-muted-foreground transition-transform', open && 'rotate-180')} />
                    </button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      aria-label={`Remove ${row.label || 'row'}`}
                      onClick={() => {
                        if (window.confirm(`Remove "${row.label || 'this row'}"? Its snapshot, if it has one, will need removing too.`)) patchGroup(gi, { rows: g.rows.filter((_, i) => i !== ri) });
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  {open && (
                    <div className="space-y-4 border-t bg-muted/30 p-3">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <Field label="What it is" htmlFor={`row-label-${row.id}`}>
                          <Input id={`row-label-${row.id}`} value={row.label} maxLength={L.short} placeholder="Pets" onChange={(e) => patchRow(gi, ri, { label: e.target.value })} />
                        </Field>
                        <Field label="What Cuppi does" htmlFor={`row-detail-${row.id}`} optional hint="A line under the name.">
                          <Input id={`row-detail-${row.id}`} value={row.detail ?? ''} maxLength={L.line} onChange={(e) => patchRow(gi, ri, { detail: e.target.value })} />
                        </Field>
                      </div>
                      <div className="grid gap-3 md:grid-cols-3">
                        {APP_IDS.map((app) => (
                          <div key={app} className="space-y-2">
                            <CellField app={app} cell={row.cells[app]} onChange={(cell) => patchRow(gi, ri, { cells: { ...row.cells, [app]: cell } })} />
                            {RIVALS.includes(app) && (
                              <SourcePicker
                                label={`Where ${APP_NAMES[app]}'s cell comes from`}
                                value={row.sources[app] ?? []}
                                sources={sources}
                                onChange={(ids) => patchRow(gi, ri, { sources: { ...row.sources, [app]: ids } })}
                              />
                            )}
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Key for this row: <code>{row.id}</code>. A rival cell that says something needs a source; "Tested by the Cuppi team" links to the snapshots page.
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
            <Button type="button" variant="outline" size="sm" disabled={rowCount >= L.rows} onClick={() => addRow(gi)}>
              <Plus className="mr-2 h-4 w-4" /> Add a row
            </Button>
          </div>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" disabled={groups.length >= L.groups} onClick={addGroup}>
        <Plus className="mr-2 h-4 w-4" /> Add a group
      </Button>
    </div>
  );
}
