'use client';

import { useState } from 'react';
import { AlertTriangle, ChevronDown, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { APP_IDS, APP_NAMES, COMPARE_LIMITS as L, allRows, emptySnapshot, proofGaps, type AppId, type CompareContent, type Shot, type SnapApp, type Snapshot } from '@/lib/compare-data';
import { Field } from './section-fields';
import { ShotsField, type UploadShot } from './compare-shots-field';

/** Replaces the draft with a function of itself: for what finishes later (an upload), which must add to the draft as it is by then. */
export type Update = (change: (c: CompareContent) => CompareContent) => void;

/** The three apps' screenshots that sit in phone frames on the comparison page. */
export function ScreenshotsTab({ content, onChange, update, upload }: { content: CompareContent; onChange: (c: CompareContent) => void; update: Update; upload: UploadShot }) {
  const set = (app: AppId, shots: Shot[]) => onChange({ ...content, shots: { ...content.shots, [app]: shots } });
  const add = (app: AppId, shot: Shot) => update((c) => ({ ...c, shots: { ...c.shots, [app]: [...c.shots[app], shot].slice(0, L.shots) } }));
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>The section</CardTitle>
          <CardDescription>“A look inside” on the comparison page: its heading, the line under it, and a caption for each app. In a caption, {'{date}'} becomes the date the facts were checked.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={content.showLook} onCheckedChange={(v) => onChange({ ...content, showLook: v === true })} />
            Show this section on the page
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Heading" htmlFor="look-heading">
              <Input id="look-heading" value={content.lookTitle} maxLength={L.short} onChange={(e) => onChange({ ...content, lookTitle: e.target.value })} />
            </Field>
            <Field label="A line under it" htmlFor="look-intro" optional>
              <Input id="look-intro" value={content.lookIntro} maxLength={L.line} onChange={(e) => onChange({ ...content, lookIntro: e.target.value })} />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {APP_IDS.map((app) => (
              <Field key={app} label={`${APP_NAMES[app]} caption`} htmlFor={`look-cap-${app}`}>
                <Input id={`look-cap-${app}`} value={content.lookCaptions[app]} maxLength={L.line} onChange={(e) => onChange({ ...content, lookCaptions: { ...content.lookCaptions, [app]: e.target.value } })} />
              </Field>
            ))}
          </div>
        </CardContent>
      </Card>
      <p className="text-sm text-muted-foreground">
        Up to three screenshots per app for “A look inside” on the comparison page. Cuppi's go in the current iPhone frame, the others in the older one. Pictures are shrunk and saved as WebP when you add them.
      </p>
      {APP_IDS.map((app) => (
        <Card key={app}>
          <CardHeader>
            <CardTitle>{APP_NAMES[app]}</CardTitle>
          </CardHeader>
          <CardContent>
            <ShotsField label={APP_NAMES[app]} shots={content.shots[app]} onChange={(shots) => set(app, shots)} onAdd={(shot) => add(app, shot)} upload={upload} defaultAlt={`${APP_NAMES[app]} on iPhone`} />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function SnapAppFields({ app, rowLabel, value, onChange, onAdd, upload }: { app: AppId; rowLabel: string; value: SnapApp; onChange: (a: SnapApp) => void; onAdd: (shot: Shot) => void; upload: UploadShot }) {
  const patch = (change: Partial<SnapApp>) => onChange({ ...value, ...change });
  const id = `${app}-${rowLabel}`.replace(/\W+/g, '-');
  return (
    <div className="space-y-3 rounded-lg border bg-background p-3">
      <ShotsField label={APP_NAMES[app]} shots={value.shots} onChange={(shots) => patch({ shots })} onAdd={onAdd} upload={upload} defaultAlt={`${APP_NAMES[app]}: ${rowLabel}`} />
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="App version" htmlFor={`${id}-v`} optional>
          <Input id={`${id}-v`} value={value.version ?? ''} maxLength={L.short} placeholder="1.9.1" onChange={(e) => patch({ version: e.target.value })} />
        </Field>
        <Field label="Phone" htmlFor={`${id}-d`} optional>
          <Input id={`${id}-d`} value={value.device ?? ''} maxLength={L.short} placeholder="iPhone 16 Pro, iOS 26.1" onChange={(e) => patch({ device: e.target.value })} />
        </Field>
        <Field label="Taken on" htmlFor={`${id}-t`} optional>
          <Input id={`${id}-t`} type="date" value={value.testedOn ?? ''} onChange={(e) => patch({ testedOn: e.target.value })} />
        </Field>
      </div>
      <Field label="What was done" htmlFor={`${id}-w`} optional hint="One line, such as “Opened the Garage tab”.">
        <Input id={`${id}-w`} value={value.what ?? ''} maxLength={L.line} onChange={(e) => patch({ what: e.target.value })} />
      </Field>
    </div>
  );
}

/**
 * The proof behind the comparison: for each row, up to three screenshots per app and how they were taken. The panel at the top
 * lists every claim that rests on "tested in the app" and has no screenshot yet.
 */
export function SnapshotsTab({ content, onChange, update, upload }: { content: CompareContent; onChange: (c: CompareContent) => void; update: Update; upload: UploadShot }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const rows = allRows(content);
  const rowLabel = (id: string) => rows.find((r) => r.id === id)?.label || id;
  const has = new Set(content.snapshots.map((s) => s.rowId));
  const gaps = proofGaps(content);
  const gapRows = [...new Set(gaps.map((g) => g.rowId))];
  const free = rows.filter((r) => !has.has(r.id));

  const add = (rowId: string) => {
    if (has.has(rowId) || content.snapshots.length >= L.snapshots) return;
    onChange({ ...content, snapshots: [...content.snapshots, emptySnapshot(rowId)] });
    setOpenId(rowId);
  };
  const patch = (rowId: string, change: Partial<Snapshot>) => onChange({ ...content, snapshots: content.snapshots.map((s) => (s.rowId === rowId ? { ...s, ...change } : s)) });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {gaps.length > 0 && <AlertTriangle className="h-5 w-5 text-amber-600" aria-hidden />}
            Claims still without a screenshot
          </CardTitle>
          <CardDescription>Every cell that cites “Tested by the Cuppi team” should have its proof. These don't yet.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {gaps.length === 0 && <p className="text-sm text-muted-foreground">Every tested claim has at least one screenshot.</p>}
          {gapRows.map((rowId) => (
            <div key={rowId} className="flex flex-wrap items-center gap-3 rounded-lg border p-2 text-sm">
              <span className="font-medium">{rowLabel(rowId)}</span>
              <span className="text-muted-foreground">{gaps.filter((g) => g.rowId === rowId).map((g) => APP_NAMES[g.app]).join(', ')}</span>
              <Button type="button" variant="outline" size="sm" className="ml-auto" onClick={() => (has.has(rowId) ? setOpenId(rowId) : add(rowId))}>
                {has.has(rowId) ? 'Open it' : 'Add a snapshot'}
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            Snapshots <span className="text-base font-normal text-muted-foreground">({content.snapshots.length})</span>
          </CardTitle>
          <CardDescription>One per row of the matrix. They appear on the snapshots page in the matrix's order.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {content.snapshots.length === 0 && <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">No snapshots yet. Add one for a row below.</p>}
          {content.snapshots.map((snap) => {
            const open = openId === snap.rowId;
            const count = APP_IDS.reduce((n, a) => n + snap.apps[a].shots.length, 0);
            const missingRow = !rows.some((r) => r.id === snap.rowId);
            return (
              <div key={snap.rowId} className="rounded-lg border">
                <div className="flex items-center gap-2 p-2">
                  <button type="button" aria-expanded={open} onClick={() => setOpenId(open ? null : snap.rowId)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                    <span className="min-w-0 flex-1">
                      <span className={cn('block truncate text-sm font-medium', missingRow && 'text-destructive')}>{missingRow ? `${snap.rowId} (row removed)` : rowLabel(snap.rowId)}</span>
                      <span className="block text-xs text-muted-foreground">
                        {count} {count === 1 ? 'screenshot' : 'screenshots'}
                      </span>
                    </span>
                    <ChevronDown className={cn('h-4 w-4 shrink-0 text-muted-foreground transition-transform', open && 'rotate-180')} />
                  </button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    aria-label={`Remove the ${rowLabel(snap.rowId)} snapshot`}
                    onClick={() => window.confirm(`Remove the snapshot for ${rowLabel(snap.rowId)}? Its screenshots are taken off the page.`) && onChange({ ...content, snapshots: content.snapshots.filter((s) => s.rowId !== snap.rowId) })}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                {open && (
                  <div className="space-y-4 border-t bg-muted/30 p-3">
                    <Field label="A line about this row" htmlFor={`snap-note-${snap.rowId}`} optional>
                      <Textarea id={`snap-note-${snap.rowId}`} rows={2} value={snap.note ?? ''} maxLength={L.text} onChange={(e) => patch(snap.rowId, { note: e.target.value })} />
                    </Field>
                    <div className="grid gap-3 xl:grid-cols-3">
                      {APP_IDS.map((app) => (
                        <SnapAppFields
                          key={app}
                          app={app}
                          rowLabel={rowLabel(snap.rowId)}
                          value={snap.apps[app]}
                          upload={upload}
                          onChange={(a) => patch(snap.rowId, { apps: { ...snap.apps, [app]: a } })}
                          onAdd={(shot) =>
                            update((c) => ({
                              ...c,
                              snapshots: c.snapshots.map((s) => (s.rowId === snap.rowId ? { ...s, apps: { ...s.apps, [app]: { ...s.apps[app], shots: [...s.apps[app].shots, shot].slice(0, L.shots) } } } : s)),
                            }))
                          }
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          {free.length > 0 && (
            <div className="pt-2">
              <select
                aria-label="Add a snapshot for a row"
                className="h-9 rounded-md border bg-background px-2 text-sm"
                value=""
                disabled={content.snapshots.length >= L.snapshots}
                onChange={(e) => e.target.value && add(e.target.value)}
              >
                <option value="">Add a snapshot for…</option>
                {free.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.label || r.id}
                  </option>
                ))}
              </select>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
