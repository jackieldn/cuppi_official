'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { APP_IDS, APP_NAMES, COMPARE_LIMITS as L, type AppId, type CompareContent, type DataPanel, type Source } from '@/lib/compare-data';
import { Field } from './section-fields';
import { SourcePicker } from './compare-source-picker';

const today = () => new Date().toISOString().slice(0, 10);

/** A textarea with one entry a line. It keeps what is typed (blank lines and all) and hands up the cleaned list. */
function LinesField({ label, hint, value, onChange, rows = 4 }: { label: string; hint?: string; value: string[]; onChange: (lines: string[]) => void; rows?: number }) {
  const [text, setText] = useState(value.join('\n'));
  return (
    <Field label={label} hint={hint}>
      <Textarea
        aria-label={label}
        rows={rows}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          onChange(e.target.value.split('\n').map((l) => l.trim()).filter(Boolean).slice(0, L.list));
        }}
      />
    </Field>
  );
}

/** The page's own words and its check date. */
export function PageTab({ content, onChange }: { content: CompareContent; onChange: (c: CompareContent) => void }) {
  const set = (change: Partial<CompareContent>) => onChange({ ...content, ...change });
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Freshness</CardTitle>
          <CardDescription>The date at the top of the page and in the small print. Set it when you have re-checked the facts, and use the button to date every source the same day.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-3">
          <Field label="Facts checked on" htmlFor="compare-checked">
            <Input id="compare-checked" type="date" value={content.checkedOn} onChange={(e) => set({ checkedOn: e.target.value })} />
          </Field>
          <Button type="button" variant="outline" onClick={() => set({ checkedOn: today(), sources: content.sources.map((s) => ({ ...s, checkedOn: today() })) })}>
            I checked everything today
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Why Cuppi</CardTitle>
          <CardDescription>The few lines under the heading and the four tiles. Their colours and icons are fixed.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field label="Introduction" htmlFor="compare-why">
            <Textarea id="compare-why" rows={3} value={content.whyIntro} maxLength={L.text} onChange={(e) => set({ whyIntro: e.target.value })} />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            {content.reasons.map((r, i) => (
              <div key={r.id} className="space-y-2 rounded-lg border p-3">
                <Input aria-label={`Tile ${i + 1} title`} value={r.title} maxLength={L.short} onChange={(e) => set({ reasons: content.reasons.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)) })} />
                <Textarea aria-label={`Tile ${i + 1} words`} rows={2} value={r.text} maxLength={L.line} onChange={(e) => set({ reasons: content.reasons.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)) })} />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Small print and notes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field label="Under the matrix: what Cuppi doesn't do" htmlFor="compare-notyet" optional hint="Leave empty to show nothing.">
            <Textarea id="compare-notyet" rows={2} value={content.notYet} maxLength={L.text} onChange={(e) => set({ notYet: e.target.value })} />
          </Field>
          <Field label="About the team's own testing" htmlFor="compare-testnote" hint="Shown in the small print at the foot of the page.">
            <Textarea id="compare-testnote" rows={3} value={content.testNote} maxLength={L.text} onChange={(e) => set({ testNote: e.target.value })} />
          </Field>
          <Field label="Top of the snapshots page" htmlFor="compare-snapintro" hint="How the screenshots were taken.">
            <Textarea id="compare-snapintro" rows={3} value={content.snapshotsIntro} maxLength={L.text} onChange={(e) => set({ snapshotsIntro: e.target.value })} />
          </Field>
        </CardContent>
      </Card>
    </div>
  );
}

/** What each app's App Store label and policy say about tracking. */
export function PrivacyTab({ content, onChange }: { content: CompareContent; onChange: (c: CompareContent) => void }) {
  const patch = (app: AppId, change: Partial<DataPanel>) => onChange({ ...content, panels: { ...content.panels, [app]: { ...content.panels[app], ...change } } });
  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">One entry a line. These come from each app's App Store privacy label and its own policy, so cite where.</p>
      {APP_IDS.map((app) => {
        const p = content.panels[app];
        return (
          <Card key={app}>
            <CardHeader>
              <CardTitle>{APP_NAMES[app]}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <LinesField label={`${APP_NAMES[app]}: used to track you`} hint="Leave empty for “Nothing”." value={p.tracking} onChange={(tracking) => patch(app, { tracking })} />
                <LinesField label={`${APP_NAMES[app]}: advertising identifiers its policy names`} value={p.identifiers} onChange={(identifiers) => patch(app, { identifiers })} />
                <LinesField label={`${APP_NAMES[app]}: linked to you`} value={p.linked} onChange={(linked) => patch(app, { linked })} />
                <LinesField label={`${APP_NAMES[app]}: not linked to you`} value={p.notLinked} onChange={(notLinked) => patch(app, { notLinked })} />
              </div>
              <Field label="A line of context" htmlFor={`panel-note-${app}`} optional>
                <Textarea id={`panel-note-${app}`} rows={2} value={p.note ?? ''} maxLength={L.text} onChange={(e) => patch(app, { note: e.target.value })} />
              </Field>
              <SourcePicker label="Sources" value={p.sources} sources={content.sources} onChange={(sources) => patch(app, { sources })} />
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

/** What the rivals cost a month. Cuppi's own price comes from the Plans page. */
export function PricesTab({ content, onChange }: { content: CompareContent; onChange: (c: CompareContent) => void }) {
  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">Cuppi's price on the page comes from the Plans admin, so it can't disagree with the Plans page. The trial line below is Cuppi's.</p>
      {(['hartley', 'familywall'] as const).map((app) => {
        const p = content.prices[app];
        const patch = (change: Partial<typeof p>) => onChange({ ...content, prices: { ...content.prices, [app]: { ...p, ...change } } });
        return (
          <Card key={app}>
            <CardHeader>
              <CardTitle>{APP_NAMES[app]}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Field label="Price a month, in pounds" htmlFor={`price-${app}`} hint="0 for free.">
                <Input id={`price-${app}`} type="number" min={0} step="0.01" value={Number.isNaN(p.monthly) ? '' : p.monthly} onChange={(e) => patch({ monthly: e.target.value === '' ? Number.NaN : Number(e.target.value) })} />
              </Field>
              <Field label="How it pays its way" htmlFor={`funding-${app}`}>
                <Input id={`funding-${app}`} value={p.funding} maxLength={L.line} onChange={(e) => patch({ funding: e.target.value })} />
              </Field>
              <SourcePicker label="Sources" value={p.sources} sources={content.sources} onChange={(sources) => patch({ sources })} />
            </CardContent>
          </Card>
        );
      })}
      <Card>
        <CardHeader>
          <CardTitle>Cuppi's trial</CardTitle>
        </CardHeader>
        <CardContent>
          <Field label="Free trial line" htmlFor="compare-trial">
            <Input id="compare-trial" value={content.trial} maxLength={L.line} onChange={(e) => onChange({ ...content, trial: e.target.value })} />
          </Field>
        </CardContent>
      </Card>
    </div>
  );
}

const blankSource = (used: Set<string>): Source => {
  let n = 1;
  while (used.has(`source-${n}`)) n++;
  return { id: `source-${n}`, label: '', url: '', checkedOn: today() };
};

/** The list every claim's small number points to. */
export function SourcesTab({ content, onChange, onRemove }: { content: CompareContent; onChange: (sources: Source[]) => void; onRemove: (id: string) => void }) {
  const used = new Set(content.sources.map((s) => s.id));
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Addresses start with https:// (or / for a page on this site, like the snapshots). Removing a source also takes it off every claim that cited it.
      </p>
      <div className="space-y-3">
        {content.sources.map((s, i) => (
          <div key={s.id} className="rounded-lg border bg-background p-3">
            <div className="grid gap-3 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1.4fr)_10rem_auto] md:items-end">
              <Field label="Name" htmlFor={`src-label-${s.id}`}>
                <Input id={`src-label-${s.id}`} value={s.label} maxLength={L.line} onChange={(e) => onChange(content.sources.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} />
              </Field>
              <Field label="Address" htmlFor={`src-url-${s.id}`} optional>
                <Input id={`src-url-${s.id}`} value={s.url ?? ''} placeholder="https://…" onChange={(e) => onChange(content.sources.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)))} />
              </Field>
              <Field label="Checked on" htmlFor={`src-date-${s.id}`}>
                <Input id={`src-date-${s.id}`} type="date" value={s.checkedOn} onChange={(e) => onChange(content.sources.map((x, j) => (j === i ? { ...x, checkedOn: e.target.value } : x)))} />
              </Field>
              <Button type="button" variant="outline" size="sm" onClick={() => window.confirm(`Remove "${s.label || s.id}" and take it off every claim that cites it?`) && onRemove(s.id)}>
                Remove
              </Button>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Key: <code>{s.id}</code>
            </p>
          </div>
        ))}
      </div>
      <Button type="button" variant="outline" size="sm" disabled={content.sources.length >= L.sources} onClick={() => onChange([...content.sources, blankSource(used)])}>
        <Plus className="mr-2 h-4 w-4" /> Add a source
      </Button>
    </div>
  );
}

