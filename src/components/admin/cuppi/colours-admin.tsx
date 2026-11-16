'use client';

import { useEffect, useMemo, useState } from 'react';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { AlertTriangle, CheckCircle2, RotateCcw } from 'lucide-react';
import { useDoc, useFirestore } from '@/firebase';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import {
  COLOURS,
  COLOUR_GROUPS,
  checkPairings,
  colourValues,
  countChanges,
  defaultHex,
  normaliseHex,
  resolveColours,
  type ColourOverrides,
  type ColourSettings,
  type Mode,
} from '@/lib/theme-colours';
import { cn } from '@/lib/utils';
import { ColourPreview } from './colour-preview';
import { describeError } from './errors';

/**
 * Edits the Cuppi site's base colours, light and dark side by side, with a live preview of each. Saved as one document
 * (cuppi_home/colours): only the colours that were changed, plus a switch for whether the site uses them. Read back
 * through resolveColours, the same function the website uses.
 */
export function ColoursAdmin() {
  const firestore = useFirestore();
  const ref = useMemo(() => (firestore ? doc(firestore, 'cuppi_home', 'colours') : null), [firestore]);
  const { data, isLoading } = useDoc<Record<string, unknown>>(ref);
  if (isLoading) return <Skeleton className="h-96 w-full" />;
  return (
    <ColoursEditor
      initial={resolveColours(data ?? null)}
      onSave={async (settings) => {
        if (!ref) throw new Error('The database is not ready yet.');
        await setDoc(ref, { ...settings, updatedAt: serverTimestamp() });
      }}
    />
  );
}

const MODES: { mode: Mode; title: string }[] = [
  { mode: 'light', title: 'Light' },
  { mode: 'dark', title: 'Dark' },
];

/** The form. It knows nothing about the database: it is given what is saved and a way to save. */
export function ColoursEditor({ initial, onSave }: { initial: ColourSettings; onSave: (settings: ColourSettings) => Promise<void> }) {
  const { toast } = useToast();
  const [draft, setDraft] = useState<ColourSettings>(initial);
  const [saved, setSaved] = useState<ColourSettings>(initial);
  const [saving, setSaving] = useState(false);

  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);
  const changes = countChanges(draft);

  /** Sets one colour. A colour put back to its designed value is simply forgotten, so only real changes are stored. */
  const setColour = (mode: Mode, key: string, hex: string) =>
    setDraft((d) => {
      const next = { ...d[mode] };
      if (hex === defaultHex(key, mode)) delete next[key];
      else next[key] = hex;
      return { ...d, [mode]: next };
    });
  const resetColour = (mode: Mode, key: string) => setDraft((d) => ({ ...d, [mode]: Object.fromEntries(Object.entries(d[mode]).filter(([k]) => k !== key)) }));
  const resetMode = (mode: Mode) => setDraft((d) => ({ ...d, [mode]: {} }));

  const save = async () => {
    setSaving(true);
    try {
      await onSave(draft);
      setSaved(draft);
      toast({
        title: 'Colours saved',
        description: draft.enabled ? (changes ? 'The site picks them up within a couple of minutes.' : 'Nothing is changed, so the site keeps its designed colours.') : 'Saved, but the site is still using its designed colours. Switch on “Use these colours on the site” to apply them.',
      });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Could not save', description: describeError(error) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_26rem]">
      <div className="space-y-6">
        <Card>
          <CardContent className="space-y-4 pt-6">
            <div className="flex items-center justify-between gap-4 rounded-lg border p-4">
              <div className="space-y-1">
                <Label htmlFor="colours-enabled" className="flex items-center gap-2 text-base">
                  Use these colours on the site
                  <Badge variant={draft.enabled ? 'default' : 'secondary'}>{draft.enabled ? 'On' : 'Off'}</Badge>
                </Label>
                <p className="text-sm text-muted-foreground">
                  {draft.enabled ? 'Visitors see your changes once you save.' : 'Off: the site keeps its designed colours. Experiment freely below; the previews always show your changes.'}
                </p>
              </div>
              <Switch id="colours-enabled" checked={draft.enabled} onCheckedChange={(enabled) => setDraft((d) => ({ ...d, enabled }))} />
            </div>
            <p className="text-sm text-muted-foreground">
              Each colour is shown for light and dark side by side. A colour you have not changed keeps its designed value, and changing one back to its designed value counts as not changed. {changes ? `${changes} changed so far.` : 'Nothing changed yet.'}
            </p>
          </CardContent>
        </Card>

        {COLOUR_GROUPS.map((g) => (
          <Card key={g.key}>
            <CardContent className="space-y-3 pt-6">
              <div>
                <h2 className="font-headline text-xl font-bold">{g.title}</h2>
                <p className="text-sm text-muted-foreground">{g.blurb}</p>
              </div>
              <div className="hidden grid-cols-[minmax(0,1fr)_11rem_11rem] gap-3 px-1 text-xs font-medium uppercase tracking-wide text-muted-foreground md:grid">
                <span />
                <span>Light</span>
                <span>Dark</span>
              </div>
              <div className="divide-y">
                {COLOURS.filter((d) => d.group === g.key).map((d) => (
                  <div key={d.key} className="grid items-center gap-2 py-3 md:grid-cols-[minmax(0,1fr)_11rem_11rem] md:gap-3">
                    <div className="min-w-0">
                      <p className="font-medium leading-tight">{d.label}</p>
                      <p className="text-xs text-muted-foreground">{d.hint}</p>
                    </div>
                    {MODES.map(({ mode, title }) => (
                      <ColourField
                        key={mode}
                        label={`${d.label}, ${title.toLowerCase()}`}
                        modeTitle={title}
                        value={draft[mode][d.key] ?? defaultHex(d.key, mode)}
                        designed={defaultHex(d.key, mode)}
                        onChange={(hex) => setColour(mode, d.key, hex)}
                        onReset={() => resetColour(mode, d.key)}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}

        <Card>
          <CardContent className="flex flex-wrap items-center gap-3 pt-6">
            <Button type="button" variant="outline" disabled={!Object.keys(draft.light).length} onClick={() => resetMode('light')}>
              Reset light colours
            </Button>
            <Button type="button" variant="outline" disabled={!Object.keys(draft.dark).length} onClick={() => resetMode('dark')}>
              Reset dark colours
            </Button>
            <span className="text-sm text-muted-foreground">Back to the designed palette. Nothing is lost until you save.</span>
          </CardContent>
        </Card>

        <div className="sticky bottom-0 flex flex-wrap items-center gap-3 border-t bg-background/95 py-3 backdrop-blur">
          <Button onClick={save} disabled={saving || !dirty}>
            {saving ? 'Saving…' : 'Save colours'}
          </Button>
          <Button type="button" variant="outline" disabled={saving || !dirty} onClick={() => setDraft(saved)}>
            Discard changes
          </Button>
          {dirty && <span className="text-sm text-muted-foreground">Unsaved changes</span>}
        </div>
      </div>

      {/* Both previews stay in view while the colours are worked through. */}
      <aside className="space-y-4 xl:sticky xl:top-4 xl:max-h-[calc(100vh-2rem)] xl:self-start xl:overflow-y-auto">
        {MODES.map(({ mode, title }) => (
          <div key={mode} className="space-y-2">
            <h2 className="text-sm font-semibold">{title} preview</h2>
            <ColourPreview mode={mode} overrides={draft[mode]} />
            <Readability mode={mode} overrides={draft[mode]} />
          </div>
        ))}
      </aside>
    </div>
  );
}

/** A colour swatch (the browser's own picker), a hex box to type or paste into, and a reset button once it differs from the design. */
function ColourField({
  label,
  modeTitle,
  value,
  designed,
  onChange,
  onReset,
}: {
  label: string;
  modeTitle: string;
  value: string;
  designed: string;
  onChange: (hex: string) => void;
  onReset: () => void;
}) {
  // What is typed in the box, which may be half a colour; the colour itself only changes once it is a whole one.
  const [raw, setRaw] = useState(value);
  useEffect(() => setRaw(value), [value]);
  const changed = value !== designed;
  return (
    <div className="flex items-center gap-2">
      <span className="w-12 shrink-0 text-xs text-muted-foreground md:hidden">{modeTitle}</span>
      <input
        type="color"
        aria-label={`${label}: pick a colour`}
        value={value}
        onChange={(e) => onChange(e.target.value.toLowerCase())}
        className="h-9 w-10 shrink-0 cursor-pointer rounded-md border bg-transparent p-0.5"
      />
      <Input
        aria-label={`${label}: hex colour`}
        value={raw}
        maxLength={7}
        spellCheck={false}
        className={cn('h-9 w-[5.75rem] px-2 font-mono text-xs uppercase', !normaliseHex(raw) && 'border-destructive')}
        onChange={(e) => {
          const text = e.target.value.startsWith('#') || !e.target.value ? e.target.value : `#${e.target.value}`;
          setRaw(text);
          const hex = normaliseHex(text);
          if (hex) onChange(hex);
        }}
        onBlur={() => setRaw(value)}
      />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={cn('h-8 w-8 shrink-0', !changed && 'invisible')}
        aria-label={`Put ${label} back to ${designed}`}
        title={`Back to ${designed.toUpperCase()}`}
        onClick={onReset}
      >
        <RotateCcw className="h-4 w-4" />
      </Button>
    </div>
  );
}

/** Whether text is still easy to read on its background in this theme (WCAG AA), listing any pairing that is not. */
function Readability({ mode, overrides }: { mode: Mode; overrides: ColourOverrides }) {
  const results = useMemo(() => checkPairings(overrides, mode), [overrides, mode]);
  const failing = results.filter((r) => !r.ok);
  const values = colourValues(overrides, mode);
  if (!failing.length) {
    return (
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <CheckCircle2 className="h-3.5 w-3.5 text-green-600" aria-hidden /> All {results.length} readability checks pass.
      </p>
    );
  }
  return (
    <div className="space-y-1 rounded-lg border border-amber-500/50 bg-amber-500/5 p-2 text-xs">
      <p className="flex items-center gap-1.5 font-medium">
        <AlertTriangle className="h-3.5 w-3.5 text-amber-600" aria-hidden /> {failing.length} {failing.length === 1 ? 'pairing is' : 'pairings are'} hard to read
      </p>
      <ul className="space-y-0.5">
        {failing.map((r) => (
          <li key={r.label} className="flex items-center justify-between gap-2">
            <span>{r.label}</span>
            <span className="flex items-center gap-1.5 tabular-nums text-muted-foreground">
              <span className="rounded px-1 py-px text-[0.65rem] font-semibold" style={{ color: values[r.text], backgroundColor: values[r.on] }}>
                Aa
              </span>
              {r.ratio.toFixed(1)}:1 (needs {r.need})
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
