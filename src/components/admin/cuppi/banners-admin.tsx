'use client';

import { useMemo, useRef, useState } from 'react';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { getDownloadURL, ref as storageRef, uploadBytes } from 'firebase/storage';
import { ImagePlus, Plus, Trash2, X } from 'lucide-react';
import { useDoc, useFirestore, useStorage } from '@/firebase';
import { SiteBanner } from '@/components/cuppi/site-banner';
import { TINTS } from '@/components/cuppi/blocks/tints';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { BANNER_COLOURS, BANNER_LIMITS as L, newBanner, phaseOf, resolveBanners, ukDay, validateBanners, type Banner, type BannerColour } from '@/lib/banners';
import { cn } from '@/lib/utils';
import { describeError } from './errors';

const COLOUR_NAMES: Record<BannerColour, string> = { honey: 'Honey', sky: 'Sky', moss: 'Moss', clay: 'Clay', lake: 'Lake' };
const MAX_ICON_BYTES = 2 * 1024 * 1024;

/**
 * Writes the banners that sit under the Cuppi site's menu. Each has the first and last day it shows, its words, a colour,
 * and optionally an icon and a link. Saved as one document (cuppi_home/banners) and read back through resolveBanners,
 * the same function the website uses. An icon uploads as soon as it is chosen (to cuppi_home/ in storage).
 */
export function BannersAdmin() {
  const firestore = useFirestore();
  const storage = useStorage();
  const ref = useMemo(() => (firestore ? doc(firestore, 'cuppi_home', 'banners') : null), [firestore]);
  const { data, isLoading } = useDoc<Record<string, unknown>>(ref);
  if (isLoading) return <Skeleton className="h-96 w-full" />;
  return (
    <BannersEditor
      initial={resolveBanners(data ?? null)}
      onSave={async (items) => {
        if (!ref) throw new Error('The database is not ready yet.');
        await setDoc(ref, { items, updatedAt: serverTimestamp() });
      }}
      onUploadIcon={async (file) => {
        if (!storage) throw new Error('Storage is not ready yet.');
        const r = storageRef(storage, `cuppi_home/banner-icon-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`);
        await uploadBytes(r, file, { contentType: file.type });
        return getDownloadURL(r);
      }}
    />
  );
}

/** The form. It knows nothing about the database: it is given what is saved and a way to save and to upload an icon. */
export function BannersEditor({
  initial,
  onSave,
  onUploadIcon,
}: {
  initial: Banner[];
  onSave: (items: Banner[]) => Promise<void>;
  onUploadIcon: (file: File) => Promise<string>;
}) {
  const { toast } = useToast();
  const [items, setItems] = useState<Banner[]>(initial);
  const [saved, setSaved] = useState<Banner[]>(initial);
  const [problems, setProblems] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const counter = useRef(0);
  const today = ukDay();

  const dirty = JSON.stringify(items) !== JSON.stringify(saved);
  const update = (id: string, patch: Partial<Banner>) => setItems((list) => list.map((b) => (b.id === id ? { ...b, ...patch } : b)));

  const add = () => {
    let id: string;
    do id = `banner-${Date.now().toString(36)}${counter.current++}`;
    while (items.some((b) => b.id === id));
    setItems((list) => [...list, newBanner(id, today)]);
  };

  const pickIcon = async (id: string, file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) return toast({ variant: 'destructive', title: 'That is not a picture', description: 'Choose a PNG, JPG, SVG or WebP image.' });
    if (file.size > MAX_ICON_BYTES) return toast({ variant: 'destructive', title: 'That picture is too big', description: 'Icons are small: keep it under 2 MB.' });
    setUploading(id);
    try {
      update(id, { iconUrl: await onUploadIcon(file) });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Could not upload the icon', description: describeError(error) });
    } finally {
      setUploading(null);
    }
  };

  const save = async () => {
    const clean = items.map((b) => ({ ...b, text: b.text.trim(), href: b.href.trim() }));
    const found = validateBanners(clean);
    setProblems(found);
    if (found.length) return;
    setSaving(true);
    try {
      await onSave(clean);
      setItems(clean);
      setSaved(clean);
      toast({ title: 'Banners saved', description: 'The site picks them up within a couple of minutes.' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Could not save', description: describeError(error) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="space-y-2 pt-6 text-sm text-muted-foreground">
          <p>
            A banner is a short notice just under the menu on every page of the Cuppi site. It appears on its <strong className="text-foreground">start date</strong> and goes by itself after its{' '}
            <strong className="text-foreground">end date</strong>, so you can set one up ahead of time and forget it. Both days are included, and dates are UK days.
          </p>
          <p>If two banners overlap, the one that started most recently shows, and the other comes back when it ends.</p>
        </CardContent>
      </Card>

      {items.length === 0 && <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">No banners yet.</p>}

      {items.map((b, n) => {
        const phase = phaseOf(b, today);
        const idBase = `banner-${n}`;
        return (
          <Card key={b.id}>
            <CardContent className="space-y-5 pt-6">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium">Banner {n + 1}</p>
                <Badge variant={phase === 'live' ? 'default' : 'secondary'}>{phase === 'live' ? 'Showing now' : phase === 'scheduled' ? 'Scheduled' : 'Finished'}</Badge>
              </div>

              <div className="space-y-2">
                <Label htmlFor={`${idBase}-text`}>Words</Label>
                <Input id={`${idBase}-text`} value={b.text} maxLength={L.text} placeholder="Our summer sale starts on Friday" onChange={(e) => update(b.id, { text: e.target.value })} />
                <p className="text-right text-xs tabular-nums text-muted-foreground">
                  {b.text.length} / {L.text}
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor={`${idBase}-start`}>Shows from</Label>
                  <Input id={`${idBase}-start`} type="date" value={b.start} onChange={(e) => update(b.id, { start: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`${idBase}-end`}>Last day</Label>
                  <Input id={`${idBase}-end`} type="date" value={b.end} min={b.start || undefined} onChange={(e) => update(b.id, { end: e.target.value })} />
                </div>
              </div>

              <fieldset className="space-y-2">
                <legend className="text-sm font-medium leading-none">Colour</legend>
                <div className="flex flex-wrap gap-2 pt-1">
                  {BANNER_COLOURS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      aria-pressed={b.colour === c}
                      onClick={() => update(b.id, { colour: c })}
                      className={cn(
                        'theme-cuppi flex items-center gap-2 rounded-full border-2 px-3 py-1.5 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                        TINTS[c].surface,
                        TINTS[c].text,
                        b.colour === c ? 'border-foreground' : 'border-transparent',
                      )}
                    >
                      {COLOUR_NAMES[c]}
                    </button>
                  ))}
                </div>
              </fieldset>

              <div className="space-y-2">
                <Label htmlFor={`${idBase}-link`}>Link (optional)</Label>
                <Input
                  id={`${idBase}-link`}
                  value={b.href}
                  placeholder="/pricing or https://example.com"
                  onChange={(e) => update(b.id, { href: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">With a link, the whole banner can be clicked. Leave it empty for a notice with no link.</p>
              </div>

              <div className="space-y-2">
                <Label>Icon (optional)</Label>
                <div className="flex flex-wrap items-center gap-3">
                  {b.iconUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={b.iconUrl} alt="" className="h-10 w-10 rounded-md border bg-muted object-contain p-1" />
                  )}
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm focus-within:ring-2 focus-within:ring-ring hover:bg-muted">
                    <ImagePlus className="h-4 w-4" /> {uploading === b.id ? 'Uploading…' : b.iconUrl ? 'Replace' : 'Upload an icon'}
                    <input
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      disabled={uploading === b.id}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        e.target.value = '';
                        void pickIcon(b.id, file);
                      }}
                    />
                  </label>
                  {b.iconUrl && (
                    <Button type="button" variant="ghost" size="sm" onClick={() => update(b.id, { iconUrl: '' })}>
                      <X className="mr-1 h-4 w-4" /> Remove
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">A small square picture, shown at about 28 pixels. A transparent PNG or SVG works best.</p>
              </div>

              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">How it will look:</p>
                {/* The real banner, in the Cuppi theme. Its link is switched off so a click here does not leave the admin. */}
                <div className="theme-cuppi pointer-events-none rounded-lg bg-cuppi-paper pb-3 pt-1 font-body text-cuppi-ink">
                  {b.text.trim() ? <SiteBanner banner={b} /> : <p className="px-4 py-3 text-sm text-cuppi-ink-soft">Write some words to see it.</p>}
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="ghost"
                  className="text-destructive hover:text-destructive"
                  onClick={() => {
                    if (window.confirm(`Remove ${b.text.trim() ? `"${b.text.trim()}"` : 'this banner'}?`)) setItems((list) => list.filter((x) => x.id !== b.id));
                  }}
                >
                  <Trash2 className="mr-2 h-4 w-4" /> Remove
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}

      <Button type="button" variant="outline" disabled={items.length >= L.items} onClick={add}>
        <Plus className="mr-2 h-4 w-4" /> Add a banner
      </Button>

      {problems.length > 0 && (
        <ul role="alert" className="list-disc space-y-1 rounded-lg border border-destructive/50 bg-destructive/5 p-4 pl-8 text-sm text-destructive">
          {problems.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      )}

      <div className="sticky bottom-0 flex flex-wrap items-center gap-3 border-t bg-background/95 py-3 backdrop-blur">
        <Button onClick={save} disabled={saving || !dirty || uploading !== null}>
          {saving ? 'Saving…' : 'Save banners'}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={saving || !dirty}
          onClick={() => {
            setItems(saved);
            setProblems([]);
          }}
        >
          Discard changes
        </Button>
        {dirty && <span className="text-sm text-muted-foreground">Unsaved changes</span>}
      </div>
    </div>
  );
}
