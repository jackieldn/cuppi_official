'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { getDownloadURL, ref as storageRef, uploadBytes } from 'firebase/storage';
import { RotateCcw } from 'lucide-react';
import { useDoc, useFirestore, useStorage } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { DisclaimersProvider } from '@/components/cuppi/disclaimer';
import { HomeHero } from '@/components/cuppi/home/hero';
import { TINTS } from '@/components/cuppi/blocks/tints';
import { Segmented } from '@/components/admin/apps/segmented';
import {
  HERO_TEMPLATES,
  LIMITS,
  PATTERN_NAMES,
  TINTS_IN_ORDER,
  buildHero,
  defaultHeroSettings,
  resolveHeroSettings,
  validateHeroSettings,
  type HeroSettings,
  type HeroTemplate,
} from '@/lib/home-hero-settings';
import { disclaimerTag, resolveDisclaimers, type Disclaimer } from '@/lib/disclaimers';
import { PATTERNS } from '@/lib/patterns';
import type { FeatureTint } from '@/lib/features-types';
import { describeError } from './errors';
import { FRAME_FIT, ImageEditor, PictureInput, UploadsContext, type AddFile } from './section-fields';
import type { FeatureImage } from '@/lib/features-types';
import { ScaledToFit } from './scaled-to-fit';

const TINT_NAMES: Record<FeatureTint, string> = { honey: 'Honey', sky: 'Sky', moss: 'Moss', clay: 'Clay', lake: 'Lake' };
const PATTERN_LABELS: Record<(typeof PATTERN_NAMES)[number], string> = {
  victorianWinter: 'Victorian winter',
  autumnPorch: 'Autumn porch',
  summerTea: 'Summer tea',
  springGarden: 'Spring garden',
};

/**
 * Edits the hero at the top of the Cuppi home page: which template it uses, the words and the
 * button, the colour, the pattern and the phone. Saved as one document (cuppi_home/hero). What
 * is stored is read back through resolveHeroSettings and drawn by buildHero + HomeHero, the same
 * code the website uses, so the preview here is the real hero rather than a lookalike.
 */
export function HeroAdmin() {
  const firestore = useFirestore();
  const storage = useStorage();
  const ref = useMemo(() => (firestore ? doc(firestore, 'cuppi_home', 'hero') : null), [firestore]);
  const { data, isLoading } = useDoc<Record<string, unknown>>(ref);
  const disclaimerRef = useMemo(() => (firestore ? doc(firestore, 'cuppi_home', 'disclaimers') : null), [firestore]);
  const disclaimerDoc = useDoc<Record<string, unknown>>(disclaimerRef);
  const disclaimers = useMemo(() => resolveDisclaimers(disclaimerDoc.data ?? null), [disclaimerDoc.data]);

  if (isLoading) return <Skeleton className="h-96 w-full" />;
  return (
    <HeroEditor
      initial={resolveHeroSettings(data ?? null)}
      disclaimers={disclaimers}
      upload={async (file) => {
        if (!storage) throw new Error('Storage is not ready yet.');
        const r = storageRef(storage, `cuppi_home/hero-screenshot-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`);
        await uploadBytes(r, file, { contentType: file.type });
        return getDownloadURL(r);
      }}
      onSave={async (hero) => {
        if (!ref) throw new Error('The database is not ready yet.');
        await setDoc(ref, { ...hero, updatedAt: serverTimestamp() });
      }}
    />
  );
}

/** The form. It knows nothing about the database: it is given what is saved and a way to save. */
export function HeroEditor({
  initial,
  disclaimers = [],
  upload,
  onSave,
}: {
  initial: HeroSettings;
  disclaimers?: Disclaimer[];
  /** Sends a chosen screenshot to storage and returns its address. */
  upload?: (file: File) => Promise<string>;
  onSave: (hero: HeroSettings) => Promise<void>;
}) {
  const { toast } = useToast();
  const [hero, setHero] = useState<HeroSettings>(initial);
  /** What is saved, to tell whether there is anything unsaved. */
  const [saved, setSaved] = useState<HeroSettings>(initial);
  const [saving, setSaving] = useState(false);
  const [problems, setProblems] = useState<string[]>([]);
  /** How many times Replay has been pressed: remounting the preview plays its opening shot again. */
  const [plays, setPlays] = useState(0);
  /** A screenshot chosen but not sent yet, by the local address the preview shows it at. */
  const chosen = useRef(new Map<string, File>());
  useEffect(() => {
    const held = chosen.current;
    return () => held.forEach((_, url) => URL.revokeObjectURL(url));
  }, []);

  /** Checks a chosen file and keeps it until Save; returns the local address the preview shows it at (or null, having said why). */
  const addFile = useCallback<AddFile>(
    (file) => {
      const refuse = (description: string) => {
        toast({ variant: 'destructive', title: 'Cannot use that file', description });
        return null;
      };
      if (!file.type.startsWith('image/')) return refuse(`${file.name} is not a picture.`);
      if (file.size >= 10 * 1024 * 1024) return refuse(`${file.name} is over 10 MB.`);
      const url = URL.createObjectURL(file);
      chosen.current.set(url, file);
      return url;
    },
    [toast],
  );

  const preview = useMemo(() => buildHero(hero), [hero]);

  const set = (patch: Partial<HeroSettings>) => setHero({ ...hero, ...patch });
  const dirty = JSON.stringify(hero) !== JSON.stringify(saved);

  const pickTemplate = (key: HeroTemplate) => {
    // A template with the words to one side turns the phone to look at them; the admin can still turn it back.
    const facing = HERO_TEMPLATES.find((t) => t.key === key)?.facing;
    set({ template: key, ...(facing ? { facing } : {}) });
  };

  const save = async () => {
    const found = validateHeroSettings(hero);
    setProblems(found);
    if (found.length > 0) return;
    let clean: HeroSettings = { ...hero, headline: hero.headline.trim(), body: hero.body.trim(), button: { ...hero.button, label: hero.button.label.trim(), href: hero.button.href.trim() } };
    setSaving(true);
    try {
      // Screenshots chosen here are still on this computer: send them up first, then save their new addresses.
      if (clean.screenshot) {
        const sent = new Map<string, string>();
        for (const local of [clean.screenshot.url, clean.screenshot.second?.url ?? ''].filter((u) => u.startsWith('blob:'))) {
          const file = chosen.current.get(local);
          if (!file || !upload) throw new Error('A chosen screenshot is no longer available. Choose it again.');
          sent.set(local, await upload(file));
        }
        const shot = clean.screenshot;
        clean = {
          ...clean,
          screenshot: {
            ...shot,
            url: sent.get(shot.url) ?? shot.url,
            alt: shot.alt.trim() || 'The Cuppi app',
            ...(shot.second ? { second: { ...shot.second, url: sent.get(shot.second.url) ?? shot.second.url, alt: shot.second.alt.trim() } } : {}),
          },
        };
        sent.forEach((_, local) => {
          URL.revokeObjectURL(local);
          chosen.current.delete(local);
        });
      }
      await onSave(clean);
      setHero(clean);
      setSaved(clean);
      toast({ title: 'Home hero saved', description: 'The site picks it up within a minute.' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Could not save the hero', description: describeError(error) });
    } finally {
      setSaving(false);
    }
  };

  const pct = (n: number) => `${Math.round(n * 100)}%`;
  const patternOn = hero.pattern !== 'none';
  const tilt = hero.phone === 'tilt';

  return (
    <UploadsContext.Provider value={addFile}>
    {/* Two columns from lg up: the preview on the left, the settings scrolling on the right, so every change is seen as it is made. */}
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:h-full lg:grid-cols-[minmax(0,1.5fr)_minmax(360px,1fr)]">
      <div className="min-w-0 lg:overflow-y-auto">
        <div className="mb-2 flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Preview</h2>
          <Button type="button" variant="outline" size="sm" onClick={() => setPlays((n) => n + 1)}>
            <RotateCcw className="mr-2 h-4 w-4" /> Replay animation
          </Button>
        </div>
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400..700&family=DM+Serif+Display:ital@0;1&display=swap" />
        <div className="theme-cuppi font-body rounded-xl border bg-cuppi-paper text-cuppi-ink">
          <ScaledToFit designWidth={1200}>
            {/* The real hero, drawn from the form as it is now (saved or not). It starts settled; Replay remounts it so the opening shot plays again. */}
            <div className="pb-3">
              <DisclaimersProvider items={disclaimers}>
                <HomeHero key={plays} hero={preview} instant={plays === 0} />
              </DisclaimersProvider>
            </div>
          </ScaledToFit>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">Drawn at desktop width and scaled to fit. Change the length below, then Replay.</p>
      </div>

      <div className="flex min-h-0 min-w-0 flex-col">
        <div className="space-y-6 lg:flex-1 lg:overflow-y-auto lg:pr-2">
          <Card>
            <CardHeader>
              <CardTitle>Template</CardTitle>
              <CardDescription>The layout. Everything below works with any of them.</CardDescription>
            </CardHeader>
            <CardContent>
              <div role="radiogroup" aria-label="Template" className="grid grid-cols-3 gap-2">
                {HERO_TEMPLATES.map((t) => {
                  const active = hero.template === t.key;
                  return (
                    <button
                      key={t.key}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() => pickTemplate(t.key)}
                      className={cn(
                        'rounded-lg border p-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                        active ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'hover:bg-muted/50',
                      )}
                    >
                      <TemplateThumb template={t.key} />
                      <p className="mt-3 text-sm font-semibold">{t.name}</p>
                      <p className="text-xs text-muted-foreground">{t.blurb}</p>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Words and button</CardTitle>
              <CardDescription>
                Put a word between *asterisks* to set it in orange italics, like *Vroom-vroom*.{disclaimers.length > 0 && ` A disclaimer tag straight after a word gives it an (i) icon: ${disclaimers.map((d) => disclaimerTag(d.id)).join(', ')}.`} The button is the quiet link under the words; the Download button lives in the menu.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="h-headline">Headline</Label>
                <Input id="h-headline" value={hero.headline} maxLength={LIMITS.headline} onChange={(e) => set({ headline: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="h-body">Words under it</Label>
                <Textarea id="h-body" value={hero.body} rows={2} maxLength={LIMITS.body} onChange={(e) => set({ body: e.target.value })} />
              </div>
              <div className="grid grid-cols-[1fr_auto] items-end gap-3">
                <div className="space-y-2">
                  <Label htmlFor="h-btn-label">Button name</Label>
                  <Input id="h-btn-label" value={hero.button.label} maxLength={LIMITS.label} disabled={!hero.button.visible} onChange={(e) => set({ button: { ...hero.button, label: e.target.value } })} />
                </div>
                <div className="flex items-center gap-2 pb-2">
                  <Switch id="h-btn-show" checked={hero.button.visible} onCheckedChange={(v) => set({ button: { ...hero.button, visible: v } })} />
                  <Label htmlFor="h-btn-show">Show</Label>
                </div>
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="h-btn-href">Button link</Label>
                  <Input id="h-btn-href" value={hero.button.href} placeholder="/page or https://…" disabled={!hero.button.visible} onChange={(e) => set({ button: { ...hero.button, href: e.target.value } })} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Colour</CardTitle>
              <CardDescription>The block the hero sits on. Lake is the dark one; the words turn cream on it.</CardDescription>
            </CardHeader>
            <CardContent>
              <div role="radiogroup" aria-label="Colour" className="flex flex-wrap gap-3">
                {TINTS_IN_ORDER.map((t) => {
                  const active = hero.tint === t;
                  return (
                    <button
                      key={t}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() => set({ tint: t })}
                      className={cn(
                        'flex items-center gap-3 rounded-lg border p-2 pr-4 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                        active ? 'border-primary ring-1 ring-primary' : 'hover:bg-muted/50',
                      )}
                    >
                      <span className="theme-cuppi inline-block">
                        <span className={cn('block h-9 w-9 rounded-md border border-black/10', TINTS[t].surface)} />
                      </span>
                      {TINT_NAMES[t]}
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Pattern</CardTitle>
              <CardDescription>The artwork from the app, laid over the colour. It stays quiet around the phone and fills in towards the corners (or the other way round).</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div role="radiogroup" aria-label="Pattern" className="grid grid-cols-3 gap-2">
                {(['none', ...PATTERN_NAMES] as const).map((p) => {
                  const active = hero.pattern === p;
                  return (
                    <button
                      key={p}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() => set({ pattern: p })}
                      className={cn(
                        'overflow-hidden rounded-lg border text-left text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                        active ? 'border-primary ring-1 ring-primary' : 'hover:bg-muted/50',
                      )}
                    >
                      <span className={cn('theme-cuppi block h-16', TINTS[hero.tint].surface)}>
                        {p !== 'none' && <span className="block h-full w-full opacity-60" style={{ backgroundImage: `url(${PATTERNS[p]})`, backgroundSize: '140px' }} />}
                      </span>
                      <span className="block px-2 py-1.5">{p === 'none' ? 'No pattern' : PATTERN_LABELS[p]}</span>
                    </button>
                  );
                })}
              </div>

              <div className={cn('grid gap-5', !patternOn && 'pointer-events-none opacity-40')} aria-disabled={!patternOn}>
                <Control label="Around the phone" value={pct(hero.patternCentre)} hint="How much pattern shows behind the phone.">
                  <Slider aria-label="Pattern strength around the phone" min={0} max={LIMITS.strength.max * 100} step={1} value={[Math.round(hero.patternCentre * 100)]} disabled={!patternOn} onValueChange={([v]) => set({ patternCentre: v / 100 })} />
                </Control>
                <Control label="At the corners" value={pct(hero.patternEdge)} hint="How much shows at the far corners.">
                  <Slider aria-label="Pattern strength at the corners" min={0} max={LIMITS.strength.max * 100} step={1} value={[Math.round(hero.patternEdge * 100)]} disabled={!patternOn} onValueChange={([v]) => set({ patternEdge: v / 100 })} />
                </Control>
                <Control label="Tile size" value={`${hero.patternSize}px`} hint="Smaller is busier.">
                  <Slider aria-label="Pattern tile size" min={LIMITS.size.min} max={LIMITS.size.max} step={20} value={[hero.patternSize]} disabled={!patternOn} onValueChange={([v]) => set({ patternSize: v })} />
                </Control>
              </div>
              <div className={cn('flex items-center gap-2', !patternOn && 'pointer-events-none opacity-40')}>
                <Switch id="h-glow" checked={hero.cursorGlow} disabled={!patternOn} onCheckedChange={(v) => set({ cursorGlow: v })} />
                <Label htmlFor="h-glow">Light the pattern up under the cursor</Label>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Phone</CardTitle>
              <CardDescription>The app screenshot in the phone, and how the phone is shown.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 border-b pb-6">
              {hero.screenshot ? (
                <ImageEditor
                  image={shotAsImage(hero)}
                  onChange={(image) => set({ screenshot: imageAsShot(image) })}
                  label="Screenshot"
                  fits={[FRAME_FIT]}
                  angle={false}
                  hint="Remove goes back to the original screenshot."
                />
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={preview.screenshot.url} alt="" className="h-24 w-auto max-w-[9rem] rounded-md border bg-muted object-contain" />
                    <p className="text-sm text-muted-foreground">The original screenshot.</p>
                  </div>
                  <PictureInput
                    label="Use your own screenshot"
                    url=""
                    empty="Upload a screenshot"
                    onChange={(url, size) => url && set({ screenshot: { url, alt: '', width: size?.width ?? 1170, height: size?.height ?? 2532, bg: '#FFFFFF' } })}
                  />
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                Use a plain screenshot from the app, not one already in a phone: the site puts it in the phone for you. You can add a second phone beside it, show the bottom of the screen instead of the top, and have the phone slide to the other end when the cursor is over it. The hero shows the top part of the screen unless you choose the bottom, so crop out anything private (a profile photo, a number plate).
              </p>
            </CardContent>
            <CardContent className="flex flex-wrap gap-x-8 gap-y-4 pt-6">
              <div className="space-y-2">
                <Label>Angle</Label>
                <div>
                  <Segmented
                    label="Phone angle"
                    value={hero.phone}
                    onChange={(phone) => set({ phone })}
                    options={[
                      { value: 'tilt', label: '45 degrees' },
                      { value: 'front', label: 'Face forward' },
                    ]}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Screen faces</Label>
                <div>
                  <Segmented
                    label="Which way the screen faces"
                    value={hero.facing}
                    onChange={(facing) => set({ facing })}
                    options={
                      hero.screenshot?.second
                        ? [
                            { value: 'right', label: 'Towards each other', disabled: !tilt },
                            { value: 'left', label: 'Apart', disabled: !tilt },
                          ]
                        : [
                            { value: 'left', label: 'Left', disabled: !tilt },
                            { value: 'right', label: 'Right', disabled: !tilt },
                          ]
                    }
                  />
                </div>
                {!tilt && <p className="text-xs text-muted-foreground">A face-forward phone looks the same either way.</p>}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Opening animation</CardTitle>
              <CardDescription>How long the camera takes to pull back when the page opens. The words, phone, pattern and button keep their timing relative to each other. Press Replay above to watch it.</CardDescription>
            </CardHeader>
            <CardContent>
              <Control label="Length" value={`${hero.introSeconds.toFixed(1)}s`} hint={`The original is 4.4s. Between ${LIMITS.intro.min} and ${LIMITS.intro.max} seconds.`}>
                <Slider aria-label="Animation length in seconds" min={LIMITS.intro.min * 10} max={LIMITS.intro.max * 10} step={2} value={[Math.round(hero.introSeconds * 10)]} onValueChange={([v]) => set({ introSeconds: v / 10 })} />
              </Control>
            </CardContent>
          </Card>

          {problems.length > 0 && (
            <ul role="alert" className="list-disc space-y-1 rounded-lg border border-destructive/50 bg-destructive/5 p-4 pl-8 text-sm text-destructive">
              {problems.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          )}
        </div>

        {/* Outside the scrolling settings, so Save is always in reach. */}
        <div className="sticky bottom-0 flex flex-wrap items-center gap-3 border-t bg-background/95 py-3 backdrop-blur lg:static lg:pt-3">
          <Button onClick={save} disabled={saving || !dirty}>
            {saving ? 'Saving…' : 'Save hero'}
          </Button>
          <Button type="button" variant="outline" disabled={saving} onClick={() => setHero(defaultHeroSettings())}>
            Start again from the original
          </Button>
          {dirty && <span className="text-sm text-muted-foreground">Unsaved changes</span>}
        </div>
      </div>
    </div>
    </UploadsContext.Provider>
  );
}

/** The hero's screenshot as the picture editor works with it: framed, at the hero's angle and facing. */
function shotAsImage(h: HeroSettings): FeatureImage {
  return { ...h.screenshot!, fit: 'frame', frame: h.phone, flip: h.phone === 'tilt' && h.facing === 'left' };
}

/** What the picture editor gives back, as the hero's screenshot (no picture means back to the original). */
function imageAsShot(i: FeatureImage): HeroSettings['screenshot'] {
  if (!i.url) return null;
  return {
    url: i.url,
    alt: i.alt,
    width: i.width ?? 1170,
    height: i.height ?? 2532,
    bg: i.bg ?? '#FFFFFF',
    ...(i.view === 'bottom' ? { view: 'bottom' as const } : {}),
    ...(i.second ? { second: i.second } : {}),
    ...(i.arrange ? { arrange: i.arrange } : {}),
    ...(i.slide ? { slide: true } : {}),
  };
}

function Control({ label, value, hint, children }: { label: string; value: string; hint: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between">
        <Label>{label}</Label>
        <span className="text-sm tabular-nums text-muted-foreground">{value}</span>
      </div>
      {children}
      <p className="text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}

/** A tiny drawing of each layout: bars for the words, a tall rounded block for the phone. */
function TemplateThumb({ template }: { template: HeroTemplate }) {
  const words = (
    <div className={cn('flex flex-1 flex-col justify-center gap-1.5', template === 'centred' && 'items-center')}>
      <span className="h-2 w-4/5 rounded-full bg-foreground/60" />
      <span className="h-2 w-3/5 rounded-full bg-foreground/60" />
      <span className="mt-1 h-1.5 w-2/5 rounded-full bg-foreground/25" />
      <span className="mt-1 h-3 w-1/4 rounded-full bg-foreground/40" />
    </div>
  );
  const phone = <span className={cn('block rounded-md border-2 border-foreground/50 bg-foreground/10', template === 'centred' ? 'mx-auto -mb-1 h-10 w-10 shrink-0 rounded-b-none' : 'h-[130%] w-1/4 self-center')} />;
  return (
    <div className={cn('flex h-24 overflow-hidden rounded-md bg-muted p-3', template === 'centred' ? 'flex-col gap-2' : 'gap-3')}>
      {template === 'split-reverse' ? (
        <>
          {phone}
          {words}
        </>
      ) : (
        <>
          {words}
          {phone}
        </>
      )}
    </div>
  );
}
