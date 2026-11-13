'use client';

import { useMemo, useState } from 'react';
import { collection, doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { ArrowDown, ArrowUp, RotateCcw } from 'lucide-react';
import { useCollection, useDoc, useFirestore } from '@/firebase';
import { AppTile } from '@/components/cuppi/feature-icon';
import { AppFan } from '@/components/cuppi/home/app-fan';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { featuresSeed } from '@/lib/features-seed';
import { GROUP_LABELS, STATUS_LABELS, isPublished, mergeFeatures, readOverride, type Feature, type FeatureOverride } from '@/lib/features-types';
import { FAN_MAX, fanShownCount, resolveFan, type FanEntry } from '@/lib/fan-settings';
import { describeError } from './errors';

/**
 * Chooses which feature icons slide out of Cuppi's icon on the home and Support pages, and in what
 * order. The icons are the features' own, so to change a picture go to Cuppi features. Saved as one
 * document (cuppi_home/fan), read back through resolveFan, the same function the website uses.
 */
export function FanAdmin() {
  const firestore = useFirestore();
  const col = useMemo(() => (firestore ? collection(firestore, 'cuppi_features') : null), [firestore]);
  const ref = useMemo(() => (firestore ? doc(firestore, 'cuppi_home', 'fan') : null), [firestore]);
  const features = useCollection<Record<string, unknown>>(col);
  const stored = useDoc<Record<string, unknown>>(ref);

  // The features the banner can show: the same list the site builds (built-ins with the admin's edits, published ones), minus "Your Home".
  const candidates = useMemo(() => {
    const overrides = (features.data ?? []).map((d) => readOverride(d.id, d)).filter((o): o is FeatureOverride => o !== null);
    return mergeFeatures(featuresSeed, overrides).filter((f) => isPublished(f) && f.group !== 'yours');
  }, [features.data]);

  if (features.isLoading || stored.isLoading) return <Skeleton className="h-96 w-full" />;
  return (
    <FanEditor
      features={candidates}
      stored={stored.data ?? null}
      onSave={async (icons) => {
        if (!ref) throw new Error('The database is not ready yet.');
        await setDoc(ref, { icons, updatedAt: serverTimestamp() });
      }}
    />
  );
}

/** The form. It knows nothing about the database: it is given the features, what is saved, and a way to save. */
export function FanEditor({ features, stored, onSave }: { features: Feature[]; stored: unknown; onSave: (icons: FanEntry[]) => Promise<void> }) {
  const { toast } = useToast();
  const [entries, setEntries] = useState<FanEntry[]>(() => resolveFan(stored, features));
  const [saved, setSaved] = useState<FanEntry[]>(entries);
  const [saving, setSaving] = useState(false);
  /** How many times Replay has been pressed: remounting the banner plays it again. */
  const [plays, setPlays] = useState(0);

  const bySlug = useMemo(() => new Map(features.map((f) => [f.slug, f])), [features]);
  const shown = fanShownCount(entries);
  const dirty = JSON.stringify(entries) !== JSON.stringify(saved);
  const inBanner = entries.filter((e) => e.visible).map((e) => bySlug.get(e.slug)!);

  const toggle = (slug: string, visible: boolean) => setEntries(entries.map((e) => (e.slug === slug ? { ...e, visible } : e)));
  const move = (i: number, by: -1 | 1) => {
    const j = i + by;
    if (j < 0 || j >= entries.length) return;
    const next = [...entries];
    [next[i], next[j]] = [next[j], next[i]];
    setEntries(next);
  };

  const save = async () => {
    setSaving(true);
    try {
      await onSave(entries);
      setSaved(entries);
      toast({ title: 'Icon banner saved', description: 'The site picks it up within a minute.' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Could not save the icon banner', description: describeError(error) });
    } finally {
      setSaving(false);
    }
  };

  // Where each shown icon lands: 1 is closest to Cuppi, and they go out right, left, right, left.
  let place = 0;

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:h-full lg:grid-cols-[minmax(0,1.5fr)_minmax(360px,1fr)]">
      <div className="min-w-0 lg:overflow-y-auto">
        <div className="mb-2 flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Preview</h2>
          <Button type="button" variant="outline" size="sm" onClick={() => setPlays((n) => n + 1)}>
            <RotateCcw className="mr-2 h-4 w-4" /> Replay animation
          </Button>
        </div>
        <div className="theme-cuppi font-body rounded-xl border bg-cuppi-paper px-4 py-10 text-cuppi-ink">
          <AppFan key={plays} features={inBanner} />
        </div>
        <p className="mt-2 text-xs text-muted-foreground">On a phone the same icons sit in two rows. The banner is on the home page and the Support page.</p>
      </div>

      <div className="flex min-h-0 min-w-0 flex-col">
        <div className="space-y-6 lg:flex-1 lg:overflow-y-auto lg:pr-2">
          <Card>
            <CardHeader>
              <CardTitle>
                Icons <span className="text-base font-normal text-muted-foreground">({shown} of {FAN_MAX} shown)</span>
              </CardTitle>
              <CardDescription>
                Switch an icon on to put it in the banner, and use the arrows to order them. The first goes to the right of Cuppi, the second to the left, and so on outwards. To change a picture, edit the feature on the Cuppi features page.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {entries.length === 0 && <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">There are no features to choose from yet.</p>}
              {entries.map((e, i) => {
                const f = bySlug.get(e.slug)!;
                const status = STATUS_LABELS[f.status ?? 'live'];
                const full = !e.visible && shown >= FAN_MAX;
                const n = e.visible ? ++place : 0;
                return (
                  <div key={e.slug} className={`flex items-center gap-3 rounded-lg border p-2 ${e.visible ? '' : 'opacity-60'}`}>
                    <div className="flex flex-col">
                      <Button type="button" variant="ghost" size="icon" className="h-6 w-6" aria-label={`Move ${f.name} up`} disabled={i === 0} onClick={() => move(i, -1)}>
                        <ArrowUp className="h-4 w-4" />
                      </Button>
                      <Button type="button" variant="ghost" size="icon" className="h-6 w-6" aria-label={`Move ${f.name} down`} disabled={i === entries.length - 1} onClick={() => move(i, 1)}>
                        <ArrowDown className="h-4 w-4" />
                      </Button>
                    </div>
                    <AppTile feature={f} className="h-10 w-10 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <span className="truncate">{f.name}</span>
                        {status && <Badge variant="secondary">{status}</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {GROUP_LABELS[f.group].title}
                        {e.visible && ` · ${n}${n === 1 ? ' (nearest Cuppi)' : ''}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2" title={full ? `The banner has room for ${FAN_MAX}. Switch another off first.` : undefined}>
                      <Switch id={`fan-${e.slug}`} checked={e.visible} disabled={full} onCheckedChange={(v) => toggle(e.slug, v)} />
                      <Label htmlFor={`fan-${e.slug}`} className="text-sm">
                        Show
                      </Label>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>

        {/* Outside the scrolling list, so Save is always in reach. */}
        <div className="sticky bottom-0 flex flex-wrap items-center gap-3 border-t bg-background/95 py-3 backdrop-blur lg:static lg:pt-3">
          <Button onClick={save} disabled={saving || !dirty}>
            {saving ? 'Saving…' : 'Save icon banner'}
          </Button>
          <Button type="button" variant="outline" disabled={saving} onClick={() => setEntries(resolveFan(null, features))}>
            Start again from the default
          </Button>
          {dirty && <span className="text-sm text-muted-foreground">Unsaved changes</span>}
        </div>
      </div>
    </div>
  );
}
