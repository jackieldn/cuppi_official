'use client';

import { useState } from 'react';
import { ImagePlus, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ReasonTile } from '@/components/cuppi/compare/reason-tile';
import { cn } from '@/lib/utils';
import { APP_IDS, APP_NAMES, COMPARE_LIMITS as L, REASON_ICONS, type AppId, type CompareContent, type DataPanel, type Reason, type Source } from '@/lib/compare-data';
import { TILE_COLOURS_LIST, type TileColour } from '@/lib/features-types';
import { Field } from './section-fields';
import { SourcePicker } from './compare-source-picker';
import { useToast } from '@/hooks/use-toast';
import { describeError } from './errors';
import type { UploadShot } from './compare-shots-field';
import type { Update } from './compare-snapshots-editor';

/** The tile colours as swatches, the same as the feature icon editor shows. */
const TILE_SWATCH: Record<TileColour, string> = { pink: '#EA9EDB', green: '#98B958', blue: '#A5CDFA', amber: '#F1A423' };

/**
 * One Why Cuppi tile's editor: its words, and its icon the way a feature's is edited: the glass squircle in a tile colour, wearing a
 * picture (a transparent glyph) or, without one, a line icon you pick. The picture uploads as soon as it is chosen.
 */
function ReasonEditor({ reason, index, onChange, onIcon, upload }: { reason: Reason; index: number; onChange: (r: Reason) => void; onIcon: (url: string) => void; upload: UploadShot }) {
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  const pick = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    try {
      const up = await upload(file);
      onIcon(up.src);
      toast({ title: 'Icon added', description: 'It is in your draft. Press Save comparison to publish it.' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Could not upload the icon', description: describeError(error) });
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="space-y-3 rounded-lg border p-3">
      <Input aria-label={`Tile ${index + 1} title`} value={reason.title} maxLength={L.short} onChange={(e) => onChange({ ...reason, title: e.target.value })} />
      <Textarea aria-label={`Tile ${index + 1} words`} rows={2} value={reason.text} maxLength={L.line} onChange={(e) => onChange({ ...reason, text: e.target.value })} />
      <fieldset className="space-y-3 rounded-lg border p-3">
        <legend className="px-1 text-xs font-medium text-muted-foreground">Icon</legend>
        <div className="flex flex-wrap items-center gap-4">
          <ReasonTile tile={reason.tile} icon={reason.icon} iconUrl={reason.iconUrl} className="h-16 w-16" />
          <div className="space-y-2.5">
            <div className="flex gap-2" role="radiogroup" aria-label={`Tile ${index + 1} colour`}>
              {TILE_COLOURS_LIST.map((c) => (
                <button
                  key={c}
                  type="button"
                  role="radio"
                  aria-checked={reason.tile === c}
                  aria-label={c}
                  onClick={() => onChange({ ...reason, tile: c })}
                  className={cn('h-7 w-7 rounded-full border-2', reason.tile === c ? 'border-foreground' : 'border-transparent')}
                  style={{ background: TILE_SWATCH[c] }}
                />
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border px-2.5 py-1.5 text-xs hover:bg-muted">
                <ImagePlus className="h-3.5 w-3.5" /> {busy ? 'Uploading…' : reason.iconUrl ? 'Replace the picture' : 'Choose a picture'}
                <input type="file" accept="image/png,image/webp,image/jpeg,image/svg+xml,.svg" className="sr-only" disabled={busy} aria-label={`Tile ${index + 1} icon picture`} onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; void pick(f); }} />
              </label>
              {reason.iconUrl && (
                <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => onChange({ ...reason, iconUrl: undefined })}>
                  <X className="mr-1 h-3.5 w-3.5" /> Use a line icon
                </Button>
              )}
            </div>
            {!reason.iconUrl && (
              <select aria-label={`Tile ${index + 1} line icon`} className="h-8 rounded-md border bg-background px-2 text-xs" value={reason.icon} onChange={(e) => onChange({ ...reason, icon: e.target.value as Reason['icon'] })}>
                {REASON_ICONS.map((i) => (
                  <option key={i} value={i}>
                    {i}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>
        <p className="text-xs text-muted-foreground">A transparent glyph (PNG, WebP or SVG) sits centred on the tile. Without one, the line icon shows in white.</p>
      </fieldset>
    </div>
  );
}

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
export function PageTab({ content, onChange, update, upload }: { content: CompareContent; onChange: (c: CompareContent) => void; update: Update; upload: UploadShot }) {
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
          <CardDescription>The heading, the few lines under it, and the four tiles with their icons. The card colours are fixed.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field label="Heading" htmlFor="compare-whytitle">
            <Input id="compare-whytitle" value={content.whyTitle} maxLength={L.short} onChange={(e) => set({ whyTitle: e.target.value })} />
          </Field>
          <Field label="Introduction" htmlFor="compare-why">
            <Textarea id="compare-why" rows={3} value={content.whyIntro} maxLength={L.text} onChange={(e) => set({ whyIntro: e.target.value })} />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            {content.reasons.map((r, i) => (
              <ReasonEditor
                key={r.id}
                reason={r}
                index={i}
                upload={upload}
                onChange={(next) => set({ reasons: content.reasons.map((x, j) => (j === i ? next : x)) })}
                onIcon={(url) => update((c) => ({ ...c, reasons: c.reasons.map((x) => (x.id === r.id ? { ...x, iconUrl: url } : x)) }))}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Section headings</CardTitle>
          <CardDescription>The heading, and the line under it, over the feature matrix, the prices, the sources and the privacy cards. “A look inside” is on the Screenshots tab. A line can be left empty.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Feature matrix: heading" htmlFor="compare-features-title">
              <Input id="compare-features-title" value={content.featuresTitle} maxLength={L.short} onChange={(e) => set({ featuresTitle: e.target.value })} />
            </Field>
            <Field label="Feature matrix: line under it" htmlFor="compare-features-intro" optional>
              <Input id="compare-features-intro" value={content.featuresIntro} maxLength={L.line} onChange={(e) => set({ featuresIntro: e.target.value })} />
            </Field>
            <Field label="Prices: heading" htmlFor="compare-price-title">
              <Input id="compare-price-title" value={content.priceTitle} maxLength={L.short} onChange={(e) => set({ priceTitle: e.target.value })} />
            </Field>
            <Field label="Prices: line under it" htmlFor="compare-price-intro" optional>
              <Input id="compare-price-intro" value={content.priceIntro} maxLength={L.line} onChange={(e) => set({ priceIntro: e.target.value })} />
            </Field>
            <Field label="Sources: heading" htmlFor="compare-sources-title">
              <Input id="compare-sources-title" value={content.sourcesTitle} maxLength={L.short} onChange={(e) => set({ sourcesTitle: e.target.value })} />
            </Field>
            <Field label="Privacy: heading" htmlFor="compare-privacy-title">
              <Input id="compare-privacy-title" value={content.privacyTitle} maxLength={L.short} onChange={(e) => set({ privacyTitle: e.target.value })} />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Privacy: line under it" htmlFor="compare-privacy-intro" optional>
                <Input id="compare-privacy-intro" value={content.privacyIntro} maxLength={L.line} onChange={(e) => set({ privacyIntro: e.target.value })} />
              </Field>
            </div>
          </div>
          <fieldset className="space-y-3 rounded-lg border p-3">
            <legend className="px-1 text-sm font-medium">Labels on the privacy cards</legend>
            <div className="grid gap-4 sm:grid-cols-2">
              {(
                [
                  ['tracking', 'First group'],
                  ['identifiers', 'Advertising identifiers'],
                  ['linked', 'Linked to you'],
                  ['notLinked', 'Not linked to you'],
                  ['nothing', 'When a card lists nothing'],
                ] as const
              ).map(([key, what]) => (
                <Field key={key} label={what} htmlFor={`compare-plabel-${key}`}>
                  <Input id={`compare-plabel-${key}`} value={content.privacyLabels[key]} maxLength={L.short} onChange={(e) => set({ privacyLabels: { ...content.privacyLabels, [key]: e.target.value } })} />
                </Field>
              ))}
            </div>
          </fieldset>
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

