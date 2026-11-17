'use client';

import { useMemo, useState } from 'react';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { getDownloadURL, ref as storageRef, uploadBytes } from 'firebase/storage';
import { ArrowDown, ArrowUp, ExternalLink, ImagePlus, X } from 'lucide-react';
import { useDoc, useFirestore, useStorage } from '@/firebase';
import { ToolTile } from '@/components/cuppi/tools/tool-tile';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { TILE_COLOURS_LIST, type TileColour } from '@/lib/features-types';
import { isLive, resolvePageStatus, type SectionStatus } from '@/lib/page-status';
import { PROPERTY_TAX } from '@/lib/tools/rates';
import { GROUP_LABELS, TOOLS } from '@/lib/tools/registry';
import { resolveToolSettings, type ToolSetting } from '@/lib/tools/settings';
import { cn } from '@/lib/utils';
import { describeError } from './errors';

const TILE_SWATCH: Record<TileColour, string> = { pink: '#EA9EDB', green: '#98B958', blue: '#A5CDFA', amber: '#F1A423' };
const MAX_ICON_BYTES = 2 * 1024 * 1024;
/** Tax rules change at Budgets and in April; flag rates that have not been checked for this long. */
const REVIEW_EVERY_MONTHS = 6;

const monthsSince = (iso: string) => {
  const then = new Date(`${iso}T12:00:00Z`);
  const now = new Date();
  return (now.getFullYear() - then.getFullYear()) * 12 + (now.getMonth() - then.getMonth());
};
const dateText = (iso: string) => new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

/**
 * The Tools: which are live, which are in the menu, each one's tile colour and icon picture, and the order.
 * Saved as one document (cuppi_home/tools), read back through resolveToolSettings, the same function the website
 * uses. The whole Tools section can also be switched off here (it is the same switch as on Cuppi pages).
 */
export function ToolsAdmin() {
  const firestore = useFirestore();
  const ref = useMemo(() => (firestore ? doc(firestore, 'cuppi_home', 'tools') : null), [firestore]);
  const stored = useDoc<Record<string, unknown>>(ref);
  if (stored.isLoading) return <Skeleton className="h-96 w-full" />;
  return (
    <ToolsEditor
      stored={stored.data ?? null}
      onSave={async (tools) => {
        if (!ref) throw new Error('The database is not ready yet.');
        await setDoc(ref, { tools, updatedAt: serverTimestamp() });
      }}
    />
  );
}

/** The form. It knows nothing about the database for the list: it is given what is saved and a way to save. */
export function ToolsEditor({ stored, onSave }: { stored: unknown; onSave: (tools: ToolSetting[]) => Promise<void> }) {
  const { toast } = useToast();
  const storage = useStorage();
  const [entries, setEntries] = useState<ToolSetting[]>(() => resolveToolSettings(stored));
  const [saved, setSaved] = useState<ToolSetting[]>(entries);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);

  const defs = useMemo(() => new Map(TOOLS.map((t) => [t.slug, t])), []);
  const dirty = JSON.stringify(entries) !== JSON.stringify(saved);
  const update = (slug: string, patch: Partial<ToolSetting>) => setEntries((list) => list.map((e) => (e.slug === slug ? { ...e, ...patch } : e)));
  const move = (i: number, by: -1 | 1) => {
    const j = i + by;
    if (j < 0 || j >= entries.length) return;
    const next = [...entries];
    [next[i], next[j]] = [next[j], next[i]];
    setEntries(next);
  };

  const pickIcon = async (slug: string, file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) return toast({ variant: 'destructive', title: 'That is not a picture', description: 'Choose a PNG, JPG, SVG or WebP image.' });
    if (file.size > MAX_ICON_BYTES) return toast({ variant: 'destructive', title: 'That picture is too big', description: 'Icons are small: keep it under 2 MB.' });
    if (!storage) return toast({ variant: 'destructive', title: 'Storage is not ready yet', description: 'Try again in a moment.' });
    setUploading(slug);
    try {
      const r = storageRef(storage, `cuppi_home/tools/${slug}-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`);
      await uploadBytes(r, file, { contentType: file.type });
      update(slug, { iconUrl: await getDownloadURL(r) });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Could not upload the icon', description: describeError(error) });
    } finally {
      setUploading(null);
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      // Firestore does not take `undefined`, so a removed icon is left out rather than blanked.
      const clean = entries.map(({ iconUrl, ...rest }) => (iconUrl ? { ...rest, iconUrl } : rest));
      await onSave(clean);
      setSaved(entries);
      toast({ title: 'Tools saved', description: 'The site picks it up within a minute.' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Could not save the tools', description: describeError(error) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <SectionSwitch />

      <Card>
        <CardHeader>
          <CardTitle>
            Tools <span className="text-base font-normal text-muted-foreground">({entries.filter((e) => e.live).length} of {entries.length} live)</span>
          </CardTitle>
          <CardDescription>
            <b>Live</b> puts a tool on the website. A tool switched off disappears from the Tools page, the menu, the footer and the sitemap, and its address shows &ldquo;not found&rdquo;. <b>In menu</b> lists a live tool in the Tools menu. Use the arrows to set the order in the menu, on the Tools page and in the footer.
            Each tool has a drawn symbol until you give it an icon picture (a transparent PNG, like the app&rsquo;s own), which sits on a tile of the colour you pick.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {entries.map((e, i) => {
            const t = defs.get(e.slug)!;
            return (
              <div key={e.slug} className={cn('rounded-lg border p-3', !e.live && 'bg-muted/40')}>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex flex-col">
                    <Button type="button" variant="ghost" size="icon" className="h-6 w-6" aria-label={`Move ${t.name} up`} disabled={i === 0} onClick={() => move(i, -1)}>
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button type="button" variant="ghost" size="icon" className="h-6 w-6" aria-label={`Move ${t.name} down`} disabled={i === entries.length - 1} onClick={() => move(i, 1)}>
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                  </div>
                  <ToolTile tool={{ glyph: t.glyph, tile: e.tile, iconUrl: e.iconUrl }} className={cn('h-12 w-12 shrink-0', !e.live && 'opacity-50')} />
                  <div className="min-w-0 flex-1 basis-48">
                    <p className="flex flex-wrap items-center gap-2 font-medium">
                      {t.name}
                      <Badge variant={e.live ? 'secondary' : 'outline'}>{e.live ? 'Live' : 'Off'}</Badge>
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {GROUP_LABELS[t.group].title} · <span className="text-xs">/tools/{t.slug}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-5">
                    <div className="flex items-center gap-2">
                      <Switch id={`live-${e.slug}`} checked={e.live} onCheckedChange={(v) => update(e.slug, { live: v })} />
                      <Label htmlFor={`live-${e.slug}`} className="text-sm">
                        Live
                      </Label>
                    </div>
                    <div className="flex items-center gap-2" title={e.live ? undefined : 'A tool that is off is not in the menu.'}>
                      <Switch id={`menu-${e.slug}`} checked={e.inMenu} disabled={!e.live} onCheckedChange={(v) => update(e.slug, { inMenu: v })} />
                      <Label htmlFor={`menu-${e.slug}`} className="text-sm">
                        In menu
                      </Label>
                    </div>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2 border-t pt-3">
                  <div className="flex items-center gap-2" role="radiogroup" aria-label={`Tile colour for ${t.name}`}>
                    <span className="text-xs text-muted-foreground">Tile</span>
                    {TILE_COLOURS_LIST.map((c) => (
                      <button
                        key={c}
                        type="button"
                        role="radio"
                        aria-checked={e.tile === c}
                        aria-label={c}
                        onClick={() => update(e.slug, { tile: c })}
                        className={cn('h-6 w-6 rounded-full border-2', e.tile === c ? 'border-foreground' : 'border-transparent')}
                        style={{ background: TILE_SWATCH[c] }}
                      />
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-1.5 text-sm hover:bg-muted">
                      <ImagePlus className="h-4 w-4" /> {uploading === e.slug ? 'Uploading…' : e.iconUrl ? 'Replace the icon' : 'Upload an icon'}
                      <input type="file" accept="image/*" className="sr-only" disabled={uploading === e.slug} onChange={(ev) => { pickIcon(e.slug, ev.target.files?.[0]); ev.target.value = ''; }} />
                    </label>
                    {e.iconUrl && (
                      <Button type="button" variant="ghost" size="sm" onClick={() => update(e.slug, { iconUrl: undefined })}>
                        <X className="mr-1 h-4 w-4" /> Remove
                      </Button>
                    )}
                  </div>
                  {e.live && (
                    <a href={`/tools/${e.slug}`} target="_blank" rel="noopener noreferrer" className="ml-auto inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
                      View on the site <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <RatesCard />

      <div className="sticky bottom-0 flex flex-wrap items-center gap-3 border-t bg-background/95 py-3 backdrop-blur">
        <Button onClick={save} disabled={saving || !dirty}>
          {saving ? 'Saving…' : 'Save tools'}
        </Button>
        <Button type="button" variant="outline" disabled={saving} onClick={() => setEntries(resolveToolSettings(null))}>
          Start again from the default
        </Button>
        {dirty && <span className="text-sm text-muted-foreground">Unsaved changes</span>}
      </div>
    </div>
  );
}

/** One switch for the whole Tools section: the same one as "Tools" on Cuppi pages (cuppi_pages/status), saved the moment it is flipped. */
function SectionSwitch() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const ref = useMemo(() => (firestore ? doc(firestore, 'cuppi_pages', 'status') : null), [firestore]);
  const { data, isLoading } = useDoc<Record<string, unknown>>(ref);
  const [saving, setSaving] = useState(false);
  if (isLoading) return <Skeleton className="h-24 w-full" />;
  const live = isLive(resolvePageStatus(data ?? null), 'tools');

  const set = async (next: SectionStatus) => {
    if (!ref) return;
    setSaving(true);
    try {
      await setDoc(ref, { tools: next, updatedAt: serverTimestamp() }, { merge: true });
      toast({ title: next === 'live' ? 'The Tools section is live' : 'The Tools section shows "refresh in progress"', description: 'Visitors see the change within a couple of minutes.' });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Could not save', description: describeError(e) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardContent className="flex flex-wrap items-center justify-between gap-3 pt-6">
        <div>
          <p className="flex items-center gap-2 font-medium">
            The whole Tools section
            <Badge variant={live ? 'secondary' : 'outline'}>{live ? 'Live' : 'Refresh in progress'}</Badge>
          </p>
          <p className="text-sm text-muted-foreground">Off, and visitors see the friendly &ldquo;a little refresh is under way&rdquo; page, and search engines are told to skip it. Saves straight away.</p>
        </div>
        <div className="flex items-center gap-2">
          <Switch id="tools-section" checked={live} disabled={saving} onCheckedChange={(v) => set(v ? 'live' : 'refresh')} />
          <Label htmlFor="tools-section" className="text-sm">
            Live
          </Label>
        </div>
      </CardContent>
    </Card>
  );
}

/** When each set of tax rates was last checked, and where to check it. Nothing to edit: the numbers are in the code (src/lib/tools/rates.ts). */
function RatesCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Tax rates</CardTitle>
        <CardDescription>
          The Stamp Duty calculator uses these. Property taxes change at Budgets and in April, so after each one, check the official page and update <code>src/lib/tools/rates.ts</code> (with its date). The site shows visitors when the rates were last checked.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {Object.values(PROPERTY_TAX).map((r) => {
          const due = monthsSince(r.reviewed) >= REVIEW_EVERY_MONTHS;
          return (
            <div key={r.short} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3">
              <div>
                <p className="flex items-center gap-2 font-medium">
                  {r.name} ({r.short})
                  {due && <Badge variant="destructive">Check due</Badge>}
                </p>
                <p className="text-sm text-muted-foreground">Last checked {dateText(r.reviewed)}</p>
              </div>
              <a href={r.source} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
                Official page <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
