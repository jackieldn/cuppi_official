'use client';

import { useMemo, useState } from 'react';
import { collection, deleteDoc, doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { getDownloadURL, ref as storageRef, uploadBytes } from 'firebase/storage';
import Link from 'next/link';
import { ArrowDown, ArrowUp, ImagePlus, LayoutTemplate, Pencil, Plus } from 'lucide-react';
import { useCollection, useFirestore, useStorage } from '@/firebase';
import { AppTile } from '@/components/cuppi/feature-icon';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { describeError } from './errors';
import { featuresSeed } from '@/lib/features-seed';
import {
  FEATURE_STATUSES,
  GROUP_LABELS,
  GROUP_ORDER,
  STATUS_LABELS,
  TILE_COLOURS_LIST,
  hasPage,
  isPublished,
  mergeFeatures,
  readOverride,
  slugify,
  type Feature,
  type FeatureGroup,
  type FeatureOverride,
  type FeatureStatus,
  type TileColour,
} from '@/lib/features-types';
import { cn } from '@/lib/utils';

const TILE_SWATCH: Record<TileColour, string> = { pink: '#EA9EDB', green: '#98B958', blue: '#A5CDFA', amber: '#F1A423' };
const STATUS_NAMES: Record<FeatureStatus, string> = { live: 'Live', preview: 'Preview', soon: 'Coming soon' };
const SEED_SLUGS = new Set(featuresSeed.map((f) => f.slug));
const MAX_BYTES = 10 * 1024 * 1024;

/**
 * Manages the features that appear in the Cuppi website's menu, overview and feature pages.
 * The built-in ones (features-seed.ts) can be renamed, reordered, switched off or given a
 * page; new ones can be added. Each is one document in cuppi_features, and the website
 * merges those over the built-ins (mergeFeatures), so a feature added here appears in the
 * menu on its own: no code change, no menu edit.
 */
export function FeaturesAdmin() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const col = useMemo(() => (firestore ? collection(firestore, 'cuppi_features') : null), [firestore]);
  const { data, isLoading, error } = useCollection<Record<string, unknown>>(col);
  const [editing, setEditing] = useState<{ feature: Feature | null } | null>(null);

  const overrides = useMemo(() => (data ?? []).map((d) => readOverride(d.id, d)).filter((o): o is FeatureOverride => o !== null), [data]);
  const features = useMemo(() => mergeFeatures(featuresSeed, overrides), [overrides]);
  const hasDoc = useMemo(() => new Set((data ?? []).map((d) => d.id)), [data]);

  if (isLoading) return <Skeleton className="h-96 w-full" />;

  const write = async (slug: string, patch: Record<string, unknown>, done?: string) => {
    if (!firestore) return;
    try {
      await setDoc(doc(firestore, 'cuppi_features', slug), { ...patch, updatedAt: serverTimestamp() }, { merge: true });
      if (done) toast({ title: done });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Could not save', description: describeError(e) });
    }
  };

  // Moving a feature renumbers its group 10, 20, 30... so equal or odd numbers never get in the way.
  const move = async (f: Feature, by: -1 | 1) => {
    const list = features.filter((x) => x.group === f.group);
    const i = list.findIndex((x) => x.slug === f.slug);
    const j = i + by;
    if (j < 0 || j >= list.length) return;
    [list[i], list[j]] = [list[j], list[i]];
    await Promise.all(list.map((x, n) => ((n + 1) * 10 !== x.order ? write(x.slug, { order: (n + 1) * 10 }) : undefined)));
  };

  return (
    <div className="space-y-8">
      {error && (
        <p role="alert" className="rounded-lg border border-destructive/50 bg-destructive/5 p-4 text-sm text-destructive">
          The feature list could not be read from the database, so edits made earlier are not shown here. {error.message}
        </p>
      )}

      <div className="flex justify-end">
        <Button onClick={() => setEditing({ feature: null })}>
          <Plus className="mr-2 h-4 w-4" /> Add a feature
        </Button>
      </div>

      {GROUP_ORDER.map((group) => {
        const items = features.filter((f) => f.group === group);
        return (
          <section key={group} className="space-y-3">
            <div>
              <h2 className="text-xl font-semibold">{GROUP_LABELS[group].title}</h2>
              <p className="text-sm text-muted-foreground">
                {group === 'yours' ? 'Listed in the "Your Home" menu.' : 'Listed in the "Features" menu.'} {GROUP_LABELS[group].blurb}.
              </p>
            </div>
            {items.length === 0 && <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">Nothing here yet.</p>}
            {items.map((f, i) => (
              <div key={f.slug} className={cn('grid items-center gap-3 rounded-lg border p-3 md:grid-cols-[auto_auto_1fr_auto_auto_auto_auto]', !isPublished(f) && 'opacity-60')}>
                <div className="flex gap-1">
                  <Button type="button" variant="ghost" size="icon" aria-label={`Move ${f.name} up`} disabled={i === 0} onClick={() => move(f, -1)}>
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                  <Button type="button" variant="ghost" size="icon" aria-label={`Move ${f.name} down`} disabled={i === items.length - 1} onClick={() => move(f, 1)}>
                    <ArrowDown className="h-4 w-4" />
                  </Button>
                </div>
                <AppTile feature={f} className="h-12 w-12" />
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2 font-medium">
                    {f.name}
                    {STATUS_LABELS[f.status] && <Badge variant="secondary">{STATUS_NAMES[f.status]}</Badge>}
                    {!hasPage(f) && <Badge variant="outline">No page yet</Badge>}
                    {!SEED_SLUGS.has(f.slug) && <Badge variant="outline">Added by you</Badge>}
                  </p>
                  <p className="truncate text-sm text-muted-foreground">{f.tagline || '—'}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Switch id={`menu-${f.slug}`} checked={f.showInMenu !== false} disabled={!isPublished(f)} onCheckedChange={(v) => write(f.slug, { showInMenu: v })} />
                  <Label htmlFor={`menu-${f.slug}`} className="text-sm">
                    In menu
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch id={`pub-${f.slug}`} checked={isPublished(f)} onCheckedChange={(v) => write(f.slug, { published: v })} />
                  <Label htmlFor={`pub-${f.slug}`} className="text-sm">
                    Published
                  </Label>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={() => setEditing({ feature: f })}>
                  <Pencil className="mr-2 h-4 w-4" /> Edit
                </Button>
                {hasPage(f) ? (
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/admin/cuppi-features/${f.slug}`}>
                      <LayoutTemplate className="mr-2 h-4 w-4" /> Sections
                    </Link>
                  </Button>
                ) : (
                  <span aria-hidden />
                )}
              </div>
            ))}
          </section>
        );
      })}

      <p className="text-sm text-muted-foreground">
        <strong>In menu</strong> off hides a feature from the top menu only; its page and the Features overview still show it. <strong>Published</strong> off removes it from the whole site, page included.
      </p>

      {editing && (
        <FeatureEditor
          // Re-mount for each feature so the form starts from that feature's values.
          key={editing.feature?.slug ?? 'new'}
          feature={editing.feature}
          takenSlugs={new Set(features.map((f) => f.slug))}
          highestOrder={Object.fromEntries(GROUP_ORDER.map((g) => [g, Math.max(0, ...features.filter((f) => f.group === g).map((f) => f.order))])) as Record<FeatureGroup, number>}
          hasDoc={editing.feature ? hasDoc.has(editing.feature.slug) : false}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

type Picked = { file: File; preview: string };

function FeatureEditor({
  feature,
  takenSlugs,
  highestOrder,
  hasDoc,
  onClose,
}: {
  feature: Feature | null;
  takenSlugs: Set<string>;
  highestOrder: Record<FeatureGroup, number>;
  hasDoc: boolean;
  onClose: () => void;
}) {
  const firestore = useFirestore();
  const storage = useStorage();
  const { toast } = useToast();
  const isNew = feature === null;
  const isBuiltIn = feature ? SEED_SLUGS.has(feature.slug) : false;

  const [name, setName] = useState(feature?.name ?? '');
  const [slug, setSlug] = useState(feature?.slug ?? '');
  const [slugTouched, setSlugTouched] = useState(false);
  const [tagline, setTagline] = useState(feature?.tagline ?? '');
  const [group, setGroup] = useState<FeatureGroup>(feature?.group ?? 'home');
  const [status, setStatus] = useState<FeatureStatus>(feature?.status ?? 'live');
  const [tile, setTile] = useState<TileColour>(feature?.tile ?? 'amber');
  const [icon, setIcon] = useState<Picked | null>(null);
  const [headline, setHeadline] = useState(feature?.hero?.headline ?? '');
  const [intro, setIntro] = useState(feature?.hero?.intro ?? '');
  const [heroAlt, setHeroAlt] = useState(feature?.hero?.image.alt ?? '');
  const [heroImage, setHeroImage] = useState<Picked | null>(null);
  const [problem, setProblem] = useState('');
  const [saving, setSaving] = useState(false);

  const heroUrl = heroImage?.preview ?? feature?.hero?.image.url;
  const iconUrl = icon?.preview ?? feature?.iconUrl;

  const pick = (file: File | undefined, set: (p: Picked | null) => void) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) return setProblem(`${file.name} is not a picture.`);
    if (file.size >= MAX_BYTES) return setProblem(`${file.name} is over 10 MB.`);
    setProblem('');
    set({ file, preview: URL.createObjectURL(file) });
  };

  const upload = async (file: File, kind: 'icon' | 'hero') => {
    if (!storage) throw new Error('Storage is not ready.');
    const r = storageRef(storage, `cuppi_features/${slug}/${kind}-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`);
    await uploadBytes(r, file);
    return getDownloadURL(r);
  };

  const save = async () => {
    if (!firestore) return;
    if (!name.trim()) return setProblem('Give the feature a name.');
    if (isNew) {
      if (!slug || slug !== slugify(slug)) return setProblem('The web address can only use lowercase letters, numbers and hyphens.');
      if (takenSlugs.has(slug)) return setProblem(`There is already a feature called "${slug}".`);
    }
    if ((headline.trim() && !heroUrl) || (!headline.trim() && heroImage)) return setProblem('A page needs both a headline and a picture, or neither (the feature then shows as "Coming soon").');
    if (feature?.hero && !headline.trim()) return setProblem('This feature already has a page, so it needs a headline.');

    setProblem('');
    setSaving(true);
    try {
      // The list above is live, but check the database itself before writing a new feature over something.
      if (isNew && (await getDoc(doc(firestore, 'cuppi_features', slug))).exists()) {
        setProblem(`There is already a feature called "${slug}".`);
        return;
      }
      const data: Record<string, unknown> = {
        name: name.trim(),
        tagline: tagline.trim(),
        group,
        // A feature with no page cannot be live: it is listed as "Coming soon".
        status: status !== 'soon' && !headline.trim() && !feature?.hero ? 'soon' : status,
        tile,
        updatedAt: serverTimestamp(),
      };
      if (icon) data.iconUrl = await upload(icon.file, 'icon');
      if (headline.trim() && heroUrl) {
        const image = heroImage ? { url: await upload(heroImage.file, 'hero'), alt: heroAlt.trim() } : { ...feature!.hero!.image, alt: heroAlt.trim() };
        data.hero = { ...(feature?.hero ?? {}), headline: headline.trim(), intro: intro.trim(), image };
      }
      if (isNew) {
        data.order = (highestOrder[group] ?? 0) + 10;
        data.published = true;
        data.showInMenu = true;
      } else if (group !== feature.group) {
        data.order = (highestOrder[group] ?? 0) + 10; // joins the end of its new group
      }
      await setDoc(doc(firestore, 'cuppi_features', slug), data, { merge: true });
      toast({ title: isNew ? `${name.trim()} added` : `${name.trim()} saved`, description: 'The site picks it up within a minute.' });
      onClose();
    } catch (e) {
      setProblem(describeError(e));
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!firestore || !feature) return;
    const ask = isBuiltIn ? `Undo every change you made to ${feature.name} and go back to how it was built?` : `Delete ${feature.name}? Its page disappears from the site. This cannot be undone.`;
    if (!window.confirm(ask)) return;
    try {
      await deleteDoc(doc(firestore, 'cuppi_features', feature.slug));
      toast({ title: isBuiltIn ? `${feature.name} is back to its original` : `${feature.name} deleted` });
      onClose();
    } catch (e) {
      setProblem(describeError(e));
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && !saving && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isNew ? 'Add a feature' : `Edit ${feature.name}`}</DialogTitle>
          <DialogDescription>
            {isNew
              ? 'Give it a name and an icon and it is listed in the menu straight away. Add a page now, or later.'
              : 'Changes appear on the site within a minute.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="f-name">Name</Label>
              <Input
                id="f-name"
                value={name}
                maxLength={60}
                onChange={(e) => {
                  setName(e.target.value);
                  if (isNew && !slugTouched) setSlug(slugify(e.target.value));
                }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="f-slug">Web address</Label>
              <div className="flex items-center gap-1 text-sm">
                <span className="text-muted-foreground">/features/</span>
                <Input
                  id="f-slug"
                  value={slug}
                  disabled={!isNew}
                  onChange={(e) => {
                    setSlugTouched(true);
                    setSlug(e.target.value);
                  }}
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="f-tagline">One line for the menu and overview</Label>
            <Input id="f-tagline" value={tagline} maxLength={200} onChange={(e) => setTagline(e.target.value)} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Where it is listed</Label>
              <Select value={group} onValueChange={(v) => setGroup(v as FeatureGroup)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {GROUP_ORDER.map((g) => (
                    <SelectItem key={g} value={g}>
                      {GROUP_LABELS[g].title} ({g === 'yours' ? 'Your Home menu' : 'Features menu'})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as FeatureStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FEATURE_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {STATUS_NAMES[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <fieldset className="space-y-3 rounded-lg border p-4">
            <legend className="px-1 text-sm font-medium">Icon</legend>
            <div className="flex flex-wrap items-center gap-5">
              <AppTile feature={{ name, icon: 'sparkles', tile, iconUrl }} className="h-20 w-20" />
              <div className="space-y-3">
                <div className="flex gap-2" role="radiogroup" aria-label="Tile colour">
                  {TILE_COLOURS_LIST.map((c) => (
                    <button
                      key={c}
                      type="button"
                      role="radio"
                      aria-checked={tile === c}
                      aria-label={c}
                      onClick={() => setTile(c)}
                      className={cn('h-8 w-8 rounded-full border-2', tile === c ? 'border-foreground' : 'border-transparent')}
                      style={{ background: TILE_SWATCH[c] }}
                    />
                  ))}
                </div>
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-muted">
                  <ImagePlus className="h-4 w-4" /> {iconUrl ? 'Replace the icon picture' : 'Choose the icon picture'}
                  <input type="file" accept="image/*" className="sr-only" onChange={(e) => pick(e.target.files?.[0], setIcon)} />
                </label>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">The glyph from the app (a transparent PNG, like the ones in the Apps tab), centred on a tile of the colour you pick. Without one, a star shows.</p>
          </fieldset>

          <fieldset className="space-y-3 rounded-lg border p-4">
            <legend className="px-1 text-sm font-medium">Feature page</legend>
            <p className="text-xs text-muted-foreground">
              Give it a headline and a picture and it gets its own page, linked from the menu. Leave them empty to list the icon now as &ldquo;Coming soon&rdquo; and add the page later.
              {feature?.blocks && ` The ${feature.blocks.length} section${feature.blocks.length === 1 ? '' : 's'} below this top block are built with Sections on the features list.`}
            </p>
            <div className="space-y-2">
              <Label htmlFor="f-headline">Headline</Label>
              <Input id="f-headline" value={headline} maxLength={200} onChange={(e) => setHeadline(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="f-intro">Introduction</Label>
              <Textarea id="f-intro" value={intro} maxLength={600} rows={3} onChange={(e) => setIntro(e.target.value)} />
            </div>
            <div className="flex flex-wrap items-end gap-4">
              {heroUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={heroUrl} alt="" className="h-24 w-auto rounded-md border bg-muted object-contain" />
              )}
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-muted">
                <ImagePlus className="h-4 w-4" /> {heroUrl ? 'Replace the picture' : 'Choose a picture'}
                <input type="file" accept="image/*" className="sr-only" onChange={(e) => pick(e.target.files?.[0], setHeroImage)} />
              </label>
              <div className="min-w-[12rem] flex-1 space-y-2">
                <Label htmlFor="f-alt">Describe the picture (for screen readers)</Label>
                <Input id="f-alt" value={heroAlt} maxLength={200} onChange={(e) => setHeroAlt(e.target.value)} />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">A phone screenshot with a transparent background works best: it rises out of the bottom of the page&rsquo;s top block.</p>
          </fieldset>

          {problem && (
            <p role="alert" className="rounded-lg border border-destructive/50 bg-destructive/5 p-3 text-sm text-destructive">
              {problem}
            </p>
          )}
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          <div>
            {!isNew && (isBuiltIn ? hasDoc : true) && (
              <Button type="button" variant="ghost" className="text-destructive" disabled={saving} onClick={remove}>
                {isBuiltIn ? 'Undo my changes' : 'Delete feature'}
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" disabled={saving} onClick={onClose}>
              Cancel
            </Button>
            <Button type="button" disabled={saving} onClick={save}>
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
