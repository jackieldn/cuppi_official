'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { getDownloadURL, ref as storageRef, uploadBytes } from 'firebase/storage';
import { Monitor, Moon, Plus, RotateCcw, Smartphone, Sun, Tablet, Trash2 } from 'lucide-react';
import { useDoc, useFirestore, useStorage } from '@/firebase';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { DisclaimersProvider } from '@/components/cuppi/disclaimer';
import { HomeHero } from '@/components/cuppi/home/hero';
import { TINTS } from '@/components/cuppi/blocks/tints';
import { Segmented } from '@/components/admin/apps/segmented';
import {
  DEFAULT_PLACEMENT,
  DEFAULT_HEIGHT_LIMIT,
  DEVICES,
  HERO_HOLD_SECONDS,
  HERO_TEMPLATES,
  LIMITS,
  MAX_HEROES,
  PATTERN_NAMES,
  TINTS_IN_ORDER,
  buildHero,
  defaultHeroSettings,
  isDefaultPlacement,
  newHeroSettings,
  resolveHeroHeight,
  resolveHeroList,
  validateHeroList,
  type Device,
  type HeightLimit,
  type HeroHeight,
  type HeroSettings,
  type HeroTemplate,
  type PhonePlacement,
} from '@/lib/home-hero-settings';
import { disclaimerTag, resolveDisclaimers, type Disclaimer } from '@/lib/disclaimers';
import { PATTERNS } from '@/lib/patterns';
import type { FeatureTint } from '@/lib/features-types';
import { describeError } from './errors';
import { FRAME_FIT, ImageEditor, PictureInput, UploadsContext, type AddFile } from './section-fields';
import type { FeatureImage } from '@/lib/features-types';
import { DevicePreview } from './device-preview';

const DEVICE_ICONS: Record<Device, typeof Monitor> = { web: Monitor, tablet: Tablet, mobile: Smartphone };

const TINT_NAMES: Record<FeatureTint, string> = { honey: 'Honey', sky: 'Sky', moss: 'Moss', clay: 'Clay', lake: 'Lake' };
const PATTERN_LABELS: Record<(typeof PATTERN_NAMES)[number], string> = {
  victorianWinter: 'Victorian winter',
  autumnPorch: 'Autumn porch',
  summerTea: 'Summer tea',
  springGarden: 'Spring garden',
};

/**
 * Edits the heroes at the top of the Cuppi home page (one to five, each in its own tab): which template
 * it uses, the words and the button, the colour, the pattern and the phone. With more than one the home
 * page shows them as a slideshow. Saved as one document (cuppi_home/hero). What is stored is read back
 * through resolveHeroList and drawn by buildHero + HomeHero, the same code the website uses, so the
 * preview here is the real hero rather than a lookalike.
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
      initial={resolveHeroList(data ?? null)}
      initialHeight={resolveHeroHeight(data ?? null)}
      disclaimers={disclaimers}
      upload={async (file) => {
        if (!storage) throw new Error('Storage is not ready yet.');
        const r = storageRef(storage, `cuppi_home/hero-screenshot-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`);
        await uploadBytes(r, file, { contentType: file.type });
        return getDownloadURL(r);
      }}
      onSave={async (heroes, height) => {
        if (!ref) throw new Error('The database is not ready yet.');
        await setDoc(ref, { heroes, height, updatedAt: serverTimestamp() });
      }}
    />
  );
}

/** The form. It knows nothing about the database: it is given what is saved and a way to save. */
export function HeroEditor({
  initial,
  initialHeight,
  disclaimers = [],
  upload,
  onSave,
}: {
  initial: HeroSettings[];
  /** How tall the heroes may be on each screen size: one setting for the whole slideshow. Saved with the heroes. */
  initialHeight: HeroHeight;
  disclaimers?: Disclaimer[];
  /** Sends a chosen screenshot to storage and returns its address. */
  upload?: (file: File) => Promise<string>;
  onSave: (heroes: HeroSettings[], height: HeroHeight) => Promise<void>;
}) {
  const { toast } = useToast();
  const [heroes, setHeroes] = useState<HeroSettings[]>(initial);
  /** What is saved, to tell whether there is anything unsaved. */
  const [saved, setSaved] = useState<HeroSettings[]>(initial);
  /** The height limit for the whole slideshow, and what is saved of it. */
  const [height, setHeight] = useState<HeroHeight>(initialHeight);
  const [savedHeight, setSavedHeight] = useState<HeroHeight>(initialHeight);
  /** Which hero's tab is open. */
  const [active, setActive] = useState(0);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const index = Math.min(active, heroes.length - 1);
  const hero = heroes[index];
  const [saving, setSaving] = useState(false);
  const [problems, setProblems] = useState<string[]>([]);
  /** How many times Replay has been pressed: remounting the preview plays its opening shot again. */
  const [plays, setPlays] = useState(0);
  /** The screen size being previewed, which is also the one the phone's position and size are being set for. */
  const [device, setDevice] = useState<Device>('web');
  /** Whether the preview shows the site in its light or its dark colours (the visitor's choice on the real site). */
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
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

  // Every hero, drawn from the form as it is now: with more than one the preview stacks them like the site's slideshow does (see below).
  const previews = useMemo(() => heroes.map((h) => buildHero(h, height)), [heroes, height]);
  const preview = previews[index];

  /** Changes the hero whose tab is open. */
  const set = (patch: Partial<HeroSettings>) => setHeroes(heroes.map((h, i) => (i === index ? { ...h, ...patch } : h)));
  const dirty = JSON.stringify(heroes) !== JSON.stringify(saved) || JSON.stringify(height) !== JSON.stringify(savedHeight);

  const addHero = () => {
    if (heroes.length >= MAX_HEROES) return;
    setHeroes([...heroes, newHeroSettings()]);
    setActive(heroes.length);
    setProblems([]);
  };
  const deleteHero = () => {
    if (heroes.length <= 1) return;
    setHeroes(heroes.filter((_, i) => i !== index));
    setActive(Math.max(0, index - 1));
    setProblems([]);
    setConfirmDelete(false);
  };

  const pickTemplate = (key: HeroTemplate) => {
    // A template with the words to one side turns the phone to look at them; the admin can still turn it back.
    const facing = HERO_TEMPLATES.find((t) => t.key === key)?.facing;
    set({ template: key, ...(facing ? { facing } : {}) });
  };

  /** One hero as it is saved: words trimmed, and any screenshot chosen here (still on this computer) sent up, its new address kept. */
  const prepare = async (h: HeroSettings, sent: Map<string, string>): Promise<HeroSettings> => {
    const clean: HeroSettings = { ...h, headline: h.headline.trim(), body: h.body.trim(), button: { ...h.button, label: h.button.label.trim(), href: h.button.href.trim() } };
    const shot = clean.screenshot;
    if (!shot) return clean;
    for (const local of [shot.url, shot.second?.url ?? ''].filter((u) => u.startsWith('blob:') && !sent.has(u))) {
      const file = chosen.current.get(local);
      if (!file || !upload) throw new Error('A chosen screenshot is no longer available. Choose it again.');
      sent.set(local, await upload(file));
    }
    return {
      ...clean,
      screenshot: {
        ...shot,
        url: sent.get(shot.url) ?? shot.url,
        alt: shot.alt.trim() || 'The Cuppi app',
        ...(shot.second ? { second: { ...shot.second, url: sent.get(shot.second.url) ?? shot.second.url, alt: shot.second.alt.trim() } } : {}),
      },
    };
  };

  const save = async () => {
    const found = validateHeroList(heroes);
    setProblems(found.map((f) => f.problem));
    if (found.length > 0) {
      // Show the first hero with something to fix.
      setActive(Math.min(found[0].index, heroes.length - 1));
      return;
    }
    setSaving(true);
    try {
      const sent = new Map<string, string>();
      const clean: HeroSettings[] = [];
      for (const h of heroes) clean.push(await prepare(h, sent));
      await onSave(clean, height);
      // Only once everything is saved are the local copies let go, so a failed save loses no chosen screenshot.
      sent.forEach((_, local) => {
        URL.revokeObjectURL(local);
        chosen.current.delete(local);
      });
      setHeroes(clean);
      setSaved(clean);
      setSavedHeight(height);
      toast({ title: clean.length > 1 ? 'Home heroes saved' : 'Home hero saved', description: 'The site picks it up within a minute.' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Could not save the heroes', description: describeError(error) });
    } finally {
      setSaving(false);
    }
  };

  const pct = (n: number) => `${Math.round(n * 100)}%`;
  const patternOn = hero.pattern !== 'none';
  const tilt = hero.phone === 'tilt';
  const placed = hero.placement[device];
  const deviceInfo = DEVICES.find((d) => d.key === device) ?? DEVICES[0];
  /** Changes the phone's position or size for the screen size being edited. */
  const place = (patch: Partial<PhonePlacement>) => set({ placement: { ...hero.placement, [device]: { ...placed, ...patch } } });
  const limit = height[device];
  /** Changes the height limit for the screen size being edited (it applies to every hero). */
  const limitHeight = (patch: Partial<HeightLimit>) => setHeight({ ...height, [device]: { ...limit, ...patch } });
  const deviceToggle = (
    <Segmented
      label="Screen size"
      value={device}
      onChange={setDevice}
      options={DEVICES.map((d) => {
        const Icon = DEVICE_ICONS[d.key];
        return { value: d.key, title: `${d.name}: ${d.range}`, label: (<><Icon className="h-4 w-4" aria-hidden />{d.name}</>) };
      })}
    />
  );

  return (
    <UploadsContext.Provider value={addFile}>
    <div className="flex flex-col gap-4 lg:h-full">
    {/* One tab per hero, then + to add another (up to five). */}
    <div className="flex flex-wrap items-center gap-2">
      <Tabs value={String(index)} onValueChange={(v) => setActive(Number(v))} className="min-w-0">
        <TabsList aria-label="Heroes" className="h-auto flex-wrap justify-start gap-1">
          {heroes.map((h, i) => (
            <TabsTrigger key={i} value={String(i)} title={plainHeadline(h.headline)} className="max-w-[13rem] gap-2">
              <span className="font-semibold">{i + 1}</span>
              <span className="truncate font-normal">{plainHeadline(h.headline) || 'Untitled'}</span>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={addHero}
        disabled={heroes.length >= MAX_HEROES}
        aria-label="Add a hero"
        title={heroes.length >= MAX_HEROES ? `The home page can have up to ${MAX_HEROES} heroes` : 'Add a hero'}
      >
        <Plus className="h-4 w-4" />
      </Button>
      <span className="text-xs text-muted-foreground">
        {heroes.length} of {MAX_HEROES}
        {heroes.length > 1 && ` · each shows for ${HERO_HOLD_SECONDS} seconds`}
      </span>
      <Button type="button" variant="outline" size="sm" className="ml-auto text-destructive hover:text-destructive" disabled={heroes.length <= 1} title={heroes.length <= 1 ? 'The home page needs at least one hero' : undefined} onClick={() => setConfirmDelete(true)}>
        <Trash2 className="mr-2 h-4 w-4" /> Delete this hero
      </Button>
    </div>

    {/* Two columns from lg up: the preview on the left, the settings scrolling on the right, so every change is seen as it is made. */}
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:min-h-0 lg:flex-1 lg:grid-cols-[minmax(0,1.5fr)_minmax(360px,1fr)]">
      <div className="min-w-0 lg:overflow-y-auto">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Preview</h2>
          <div className="flex flex-wrap items-center gap-2">
            {deviceToggle}
            <Segmented
              label="Colour mode"
              value={theme}
              onChange={setTheme}
              options={[
                { value: 'light', title: 'Show the site in its light colours', label: (<><Sun className="h-4 w-4" aria-hidden />Light</>) },
                { value: 'dark', title: 'Show the site in its dark colours', label: (<><Moon className="h-4 w-4" aria-hidden />Dark</>) },
              ]}
            />
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => setPlays((n) => n + 1)}>
            <RotateCcw className="mr-2 h-4 w-4" /> Replay animation
          </Button>
        </div>
        {/* The real hero, drawn from the form as it is now (saved or not), on a screen of the chosen width. It starts settled; Replay remounts it so the opening shot plays again. */}
        <DevicePreview width={deviceInfo.width} screenHeight={deviceInfo.screen} theme={theme}>
          <div className="pb-3">
            <DisclaimersProvider items={disclaimers}>
              {previews.length > 1 ? (
                // As on the site (HeroCarousel): the heroes sit on top of one another in one cell, so every one is as tall as the tallest and
                // each fills it. A hero's phone is centred in that cell, so on its own a short hero would be drawn higher than it is on the
                // page. The ones not being edited are only there to give the cell its height: unseen and out of reach.
                <div className="grid">
                  {previews.map((p, i) => (
                    <div key={i} aria-hidden={i !== index} className={cn('col-start-1 row-start-1', i !== index && 'invisible')}>
                      <HomeHero key={i === index ? `${i}-${plays}` : i} hero={p} instant={i !== index || plays === 0} fill />
                    </div>
                  ))}
                </div>
              ) : (
                <HomeHero key={`${index}-${plays}`} hero={preview} instant={plays === 0} />
              )}
            </DisclaimersProvider>
          </div>
        </DevicePreview>
        <p className="mt-2 text-xs text-muted-foreground">
          {deviceInfo.name} preview in {theme} colours, drawn {deviceInfo.width}px wide{deviceInfo.width > 700 ? ' and scaled to fit' : ''}: the layout is the one a screen {deviceInfo.range} gets.{heroes.length > 1 && ' Like the site, every hero is as tall as the tallest, so a shorter one has its phone centred in the taller block.'} Change the length below, then Replay.
          {heroes.length > 1 && ` On the site, dots under the hero show the others, and a line fills up over ${HERO_HOLD_SECONDS} seconds before the next one takes over.`}
        </p>
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
              <CardTitle>Phone position and size</CardTitle>
              <CardDescription>
                Move and resize the phone on its own for each kind of screen. The preview switches with the size you pick here, so you see what you are setting.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                {deviceToggle}
                <span className="text-xs text-muted-foreground">Screens {deviceInfo.range}</span>
              </div>
              <div className="grid gap-5">
                <Control label="Across" value={`${placed.x > 0 ? '+' : ''}${placed.x}%`} hint="Left to right. 0 is where the layout puts it.">
                  <Slider aria-label={`Phone position across, ${deviceInfo.name}`} min={LIMITS.offset.min} max={LIMITS.offset.max} step={1} value={[placed.x]} onValueChange={([v]) => place({ x: v })} />
                </Control>
                <Control label="Up and down" value={`${placed.y > 0 ? '+' : ''}${placed.y}%`} hint="Positive moves it down. 0 is where the layout puts it.">
                  <Slider aria-label={`Phone position up and down, ${deviceInfo.name}`} min={LIMITS.offset.min} max={LIMITS.offset.max} step={1} value={[placed.y]} onValueChange={([v]) => place({ y: v })} />
                </Control>
                <Control label="Size" value={`${placed.scale}%`} hint="100% is the size the layout gives it. It grows from the top edge.">
                  <Slider aria-label={`Phone size, ${deviceInfo.name}`} min={LIMITS.scale.min} max={LIMITS.scale.max} step={1} value={[placed.scale]} onValueChange={([v]) => place({ scale: v })} />
                </Control>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button type="button" variant="outline" size="sm" disabled={isDefaultPlacement(placed)} onClick={() => place({ ...DEFAULT_PLACEMENT })}>
                  <RotateCcw className="mr-2 h-4 w-4" /> Reset {deviceInfo.name.toLowerCase()}
                </Button>
                <span className="text-xs text-muted-foreground">
                  {DEVICES.filter((d) => !isDefaultPlacement(hero.placement[d.key])).map((d) => d.name).join(', ') || 'Nothing moved yet'}
                  {DEVICES.some((d) => !isDefaultPlacement(hero.placement[d.key])) && ' set'}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Hero height</CardTitle>
              <CardDescription>
                For the whole slideshow, not just this hero. With a limit on, the block is never taller than the screen it is on, so it fits a laptop without scrolling. The phone is cropped a little lower; the words are never cut off.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                {deviceToggle}
                <span className="text-xs text-muted-foreground">Screens {deviceInfo.range}</span>
              </div>
              <div className="flex items-center gap-2">
                <Switch id="h-fit" checked={limit.fit} onCheckedChange={(v) => limitHeight({ fit: v })} />
                <Label htmlFor="h-fit">Fit to the screen’s height ({deviceInfo.name.toLowerCase()})</Label>
              </div>
              <div className={cn(!limit.fit && 'pointer-events-none opacity-40')} aria-disabled={!limit.fit}>
                <Control label="Tallest it can be" value={`${limit.share}% of the screen`} hint="100% means the menu and the hero together just fill the screen. A hero that is already shorter than this is left as it is.">
                  <Slider aria-label={`Hero height limit, ${deviceInfo.name}`} min={LIMITS.share.min} max={LIMITS.share.max} step={1} value={[limit.share]} disabled={!limit.fit} onValueChange={([v]) => limitHeight({ share: v })} />
                </Control>
              </div>
              <p className="text-xs text-muted-foreground">
                The preview pretends to be a screen {deviceInfo.width} wide and {deviceInfo.screen}px tall. Real screens vary, which is why this is a share of the screen rather than a fixed height.
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <Button type="button" variant="outline" size="sm" disabled={!limit.fit && limit.share === DEFAULT_HEIGHT_LIMIT.share} onClick={() => limitHeight({ ...DEFAULT_HEIGHT_LIMIT })}>
                  <RotateCcw className="mr-2 h-4 w-4" /> Remove the limit ({deviceInfo.name.toLowerCase()})
                </Button>
                <span className="text-xs text-muted-foreground">
                  {DEVICES.filter((d) => height[d.key].fit).map((d) => d.name).join(', ') || 'No limit on any screen'}
                  {DEVICES.some((d) => height[d.key].fit) && ' limited'}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Opening animation</CardTitle>
              <CardDescription>
                How long the camera takes to pull back when the page opens. The words, phone, pattern and button keep their timing relative to each other. Press Replay above to watch it.
                {heroes.length > 1 && index > 0 && ' Only the first hero plays this when the page opens: the others fade in when their turn comes.'}
              </CardDescription>
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
          <Button type="button" variant="outline" disabled={saving} onClick={() => setHeroes(heroes.map((h, i) => (i === index ? defaultHeroSettings() : h)))}>
            Start this hero again from the original
          </Button>
          {dirty && <span className="text-sm text-muted-foreground">Unsaved changes</span>}
        </div>
      </div>
    </div>

    <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete hero {index + 1}?</AlertDialogTitle>
          <AlertDialogDescription>
            “{plainHeadline(hero.headline)}” comes out of the slideshow. Nothing changes on the site until you press Save.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep it</AlertDialogCancel>
          <AlertDialogAction onClick={deleteHero}>Delete hero</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </div>
    </UploadsContext.Provider>
  );
}

/** A headline without its *asterisks*, for a tab or a sentence. */
const plainHeadline = (headline: string) => headline.replace(/\*/g, '').trim();

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
