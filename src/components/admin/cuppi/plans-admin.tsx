'use client';

import { useMemo, useState } from 'react';
import { collection, doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { ArrowDown, ArrowUp, ChevronDown, Copy, Plus, Trash2 } from 'lucide-react';
import { useCollection, useDoc, useFirestore } from '@/firebase';
import { AppTile, CuppiTile } from '@/components/cuppi/feature-icon';
import { PlansView } from '@/components/cuppi/plans/plans-view';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { SECTION_LIMITS as L } from '@/lib/feature-sections';
import { featuresSeed } from '@/lib/features-seed';
import { GROUP_LABELS, isPublished, mergeFeatures, readOverride, type Feature, type FeatureOverride } from '@/lib/features-types';
import { PLANS_LIMITS, defaultSections, featurePlanRows, newCustomId, resolvePlans, storedPlans, validatePlans, type PlanSection, type PlansSettings } from '@/lib/plans-settings';
import { describeError } from './errors';
import { Field, RowList } from './section-fields';

/**
 * The Plans page: the prices, and a Free / Pro table for each feature you choose. Adding a feature copies the
 * table from its own page, so the work is already done; after that the Plans page's copy is its own. Saved as one
 * document (cuppi_home/plans), read back through resolvePlans, the same function the website uses.
 */
export function PlansAdmin() {
  const firestore = useFirestore();
  const col = useMemo(() => (firestore ? collection(firestore, 'cuppi_features') : null), [firestore]);
  const ref = useMemo(() => (firestore ? doc(firestore, 'cuppi_home', 'plans') : null), [firestore]);
  const features = useCollection<Record<string, unknown>>(col);
  const stored = useDoc<Record<string, unknown>>(ref);

  // The same list the site builds: the built-in features with the admin's edits, the published ones.
  const published = useMemo(() => {
    const overrides = (features.data ?? []).map((d) => readOverride(d.id, d)).filter((o): o is FeatureOverride => o !== null);
    return mergeFeatures(featuresSeed, overrides).filter(isPublished);
  }, [features.data]);

  if (features.isLoading || stored.isLoading) return <Skeleton className="h-96 w-full" />;
  return (
    <PlansEditor
      features={published}
      stored={stored.data ?? null}
      onSave={async (settings) => {
        if (!ref) throw new Error('The database is not ready yet.');
        await setDoc(ref, { ...storedPlans(settings), updatedAt: serverTimestamp() });
      }}
    />
  );
}

const blankRow = () => ({ label: '', free: '', pro: '' });

/** The form. It knows nothing about the database: it is given the features, what is saved, and a way to save. */
export function PlansEditor({ features, stored, onSave }: { features: Feature[]; stored: unknown; onSave: (settings: PlansSettings) => Promise<void> }) {
  const { toast } = useToast();
  const [settings, setSettings] = useState<PlansSettings>(() => resolvePlans(stored, features));
  const [saved, setSaved] = useState<PlansSettings>(settings);
  const [saving, setSaving] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);

  const bySlug = useMemo(() => new Map(features.map((f) => [f.slug, f])), [features]);
  const nameOf = (s: PlanSection) => (s.feature ? bySlug.get(s.feature)?.name : s.title?.trim()) || 'A table of your own';
  const dirty = JSON.stringify(settings) !== JSON.stringify(saved);
  const onPage = new Set(settings.sections.map((s) => s.feature).filter(Boolean));
  const available = features.filter((f) => !onPage.has(f.slug));
  const full = settings.sections.length >= PLANS_LIMITS.sections;

  const setSections = (sections: PlanSection[]) => setSettings({ ...settings, sections });
  const patch = (id: string, change: Partial<PlanSection>) => setSections(settings.sections.map((s) => (s.id === id ? { ...s, ...change } : s)));
  const move = (i: number, by: -1 | 1) => {
    const j = i + by;
    if (j < 0 || j >= settings.sections.length) return;
    const next = [...settings.sections];
    [next[i], next[j]] = [next[j], next[i]];
    setSections(next);
  };
  const addFeature = (f: Feature) => {
    const rows = featurePlanRows(f);
    setSections([...settings.sections, { id: f.slug, feature: f.slug, rows: rows.length > 0 ? rows : [blankRow()] }]);
    setOpenId(f.slug);
  };
  const addCustom = () => {
    const id = newCustomId(settings.sections);
    setSections([...settings.sections, { id, title: '', rows: [blankRow()] }]);
    setOpenId(id);
  };
  const remove = (s: PlanSection) => {
    if (!window.confirm(`Take ${nameOf(s)} off the Plans page? Its table here is lost (the feature page keeps its own).`)) return;
    setSections(settings.sections.filter((x) => x.id !== s.id));
  };
  const recopy = (s: PlanSection) => {
    const f = s.feature ? bySlug.get(s.feature) : undefined;
    const rows = f ? featurePlanRows(f) : [];
    if (rows.length === 0) return;
    if (!window.confirm(`Replace this table with the one on the ${f!.name} page? Your changes to it here are lost.`)) return;
    patch(s.id, { rows });
  };

  const save = async () => {
    const problems = validatePlans(settings, nameOf);
    if (problems.length > 0) {
      toast({ variant: 'destructive', title: 'The Plans page is not ready to save', description: problems.join(' ') });
      return;
    }
    setSaving(true);
    try {
      await onSave(settings);
      setSaved(settings);
      toast({ title: 'Plans saved', description: 'The site picks it up within a minute.' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Could not save the Plans page', description: describeError(error) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:h-full lg:grid-cols-[minmax(0,1.3fr)_minmax(380px,1fr)]">
      <div className="min-w-0 lg:overflow-y-auto">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Preview</h2>
        <div className="theme-cuppi font-body rounded-xl border bg-background pb-6 text-cuppi-ink">
          <PlansView settings={settings} features={features} />
        </div>
        <p className="mt-2 text-xs text-muted-foreground">The page is at /plans. A table is empty-handed until it has a line, and a feature that is switched off disappears from it.</p>
      </div>

      <div className="flex min-h-0 min-w-0 flex-col">
        <div className="space-y-6 lg:flex-1 lg:overflow-y-auto lg:pr-2">
          <Card>
            <CardHeader>
              <CardTitle>Prices</CardTitle>
              <CardDescription>Shown in the Pro card at the top. Free is always free.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <Field label="Pro monthly" htmlFor="plans-monthly">
                <Input id="plans-monthly" value={settings.prices.monthly} maxLength={PLANS_LIMITS.price} onChange={(e) => setSettings({ ...settings, prices: { ...settings.prices, monthly: e.target.value } })} />
              </Field>
              <Field label="Pro annual" htmlFor="plans-annual">
                <Input id="plans-annual" value={settings.prices.annual} maxLength={PLANS_LIMITS.price} onChange={(e) => setSettings({ ...settings, prices: { ...settings.prices, annual: e.target.value } })} />
              </Field>
              <Field label="Note under the monthly price" htmlFor="plans-monthly-note" optional hint="For example “1 month free”.">
                <Input id="plans-monthly-note" value={settings.prices.monthlyNote} maxLength={PLANS_LIMITS.note} onChange={(e) => setSettings({ ...settings, prices: { ...settings.prices, monthlyNote: e.target.value } })} />
              </Field>
              <Field label="Note under the annual price" htmlFor="plans-note" optional hint="For example “1+2 months free”.">
                <Input id="plans-note" value={settings.prices.annualNote} maxLength={PLANS_LIMITS.note} onChange={(e) => setSettings({ ...settings, prices: { ...settings.prices, annualNote: e.target.value } })} />
              </Field>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>
                Tables <span className="text-base font-normal text-muted-foreground">({settings.sections.length})</span>
              </CardTitle>
              <CardDescription>One under another, in this order. Open one to edit its lines. In a cell, type Yes for a tick, No for a dash, or any words.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {settings.sections.length === 0 && <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">No tables yet. Add a feature below.</p>}
              {settings.sections.map((s, i) => {
                const f = s.feature ? bySlug.get(s.feature) : undefined;
                const open = openId === s.id;
                return (
                  <div key={s.id} className="rounded-lg border">
                    <div className="flex items-center gap-2 p-2">
                      <div className="flex flex-col">
                        <Button type="button" variant="ghost" size="icon" className="h-6 w-6" aria-label={`Move ${nameOf(s)} up`} disabled={i === 0} onClick={() => move(i, -1)}>
                          <ArrowUp className="h-4 w-4" />
                        </Button>
                        <Button type="button" variant="ghost" size="icon" className="h-6 w-6" aria-label={`Move ${nameOf(s)} down`} disabled={i === settings.sections.length - 1} onClick={() => move(i, 1)}>
                          <ArrowDown className="h-4 w-4" />
                        </Button>
                      </div>
                      <button type="button" aria-expanded={open} onClick={() => setOpenId(open ? null : s.id)} className="flex min-w-0 flex-1 items-center gap-3 rounded-md text-left">
                        {f ? <AppTile feature={f} className="h-10 w-10" /> : <CuppiTile className="h-10 w-10" />}
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium">{nameOf(s)}</span>
                          <span className="block text-xs text-muted-foreground">
                            {f ? GROUP_LABELS[f.group].title : 'Your own table'} · {s.rows.length} {s.rows.length === 1 ? 'line' : 'lines'}
                          </span>
                        </span>
                        <ChevronDown className={cn('h-4 w-4 shrink-0 text-muted-foreground transition-transform', open && 'rotate-180')} />
                      </button>
                      <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" aria-label={`Remove ${nameOf(s)}`} onClick={() => remove(s)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    {open && (
                      <div className="space-y-4 border-t bg-muted/30 p-3">
                        {!s.feature && (
                          <Field label="Title" htmlFor={`plans-title-${s.id}`}>
                            <Input id={`plans-title-${s.id}`} value={s.title ?? ''} maxLength={PLANS_LIMITS.title} placeholder="Your Home" onChange={(e) => patch(s.id, { title: e.target.value })} />
                          </Field>
                        )}
                        <Field label="A line under the name" htmlFor={`plans-intro-${s.id}`} optional>
                          <Textarea id={`plans-intro-${s.id}`} rows={2} value={s.intro ?? ''} maxLength={PLANS_LIMITS.intro} onChange={(e) => patch(s.id, { intro: e.target.value })} />
                        </Field>
                        <RowList
                          noun="line"
                          max={L.rows}
                          items={s.rows}
                          onChange={(rows) => patch(s.id, { rows })}
                          blank={blankRow}
                          render={(row, update) => (
                            <>
                              <Field label="What it is">
                                <Input value={row.label} maxLength={L.title} placeholder="Pet profiles" onChange={(e) => update({ label: e.target.value })} />
                              </Field>
                              <div className="grid grid-cols-2 gap-3">
                                <Field label="Free">
                                  <Input value={row.free} maxLength={L.cell} placeholder="1" onChange={(e) => update({ free: e.target.value })} />
                                </Field>
                                <Field label="Pro">
                                  <Input value={row.pro} maxLength={L.cell} placeholder="Unlimited" onChange={(e) => update({ pro: e.target.value })} />
                                </Field>
                              </div>
                            </>
                          )}
                        />
                        {f && featurePlanRows(f).length > 0 && (
                          <Button type="button" variant="outline" size="sm" onClick={() => recopy(s)}>
                            <Copy className="mr-2 h-4 w-4" /> Copy again from the {f.name} page
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Add a table</CardTitle>
              <CardDescription>
                Pick a feature to add it. If it already has a Free and Pro table on its own page, that is copied in for you. Its icon and name always follow the feature.
                {full && ` The page holds up to ${PLANS_LIMITS.sections}.`}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {available.length === 0 ? (
                <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">Every feature is on the page.</p>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2">
                  {available.map((f) => {
                    const has = featurePlanRows(f).length > 0;
                    return (
                      <button
                        key={f.slug}
                        type="button"
                        disabled={full}
                        onClick={() => addFeature(f)}
                        className="flex items-center gap-3 rounded-lg border p-2 text-left transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <AppTile feature={f} className="h-10 w-10" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium">{f.name}</span>
                          <span className="block text-xs text-muted-foreground">{has ? 'Has a table on its page' : GROUP_LABELS[f.group].title}</span>
                        </span>
                        {has && <Badge variant="secondary">Copy</Badge>}
                        <Plus className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                      </button>
                    );
                  })}
                </div>
              )}
              <Button type="button" variant="outline" size="sm" disabled={full} onClick={addCustom}>
                <Plus className="mr-2 h-4 w-4" /> A table of your own
              </Button>
              <p className="text-xs text-muted-foreground">For limits that belong to no one feature, like how many people a home can have.</p>
            </CardContent>
          </Card>
        </div>

        {/* Outside the scrolling list, so Save is always in reach. */}
        <div className="sticky bottom-0 flex flex-wrap items-center gap-3 border-t bg-background/95 py-3 backdrop-blur lg:static lg:pt-3">
          <Button onClick={save} disabled={saving || !dirty}>
            {saving ? 'Saving…' : 'Save Plans'}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={saving}
            onClick={() => {
              if (window.confirm('Start again from the tables on the feature pages? Your edits here are lost.')) setSettings({ ...settings, sections: defaultSections(features) });
            }}
          >
            Start again from the feature pages
          </Button>
          {dirty && <span className="text-sm text-muted-foreground">Unsaved changes</span>}
        </div>
      </div>
    </div>
  );
}
