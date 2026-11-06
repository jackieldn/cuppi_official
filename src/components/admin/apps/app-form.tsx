'use client';

import { useEffect, useMemo, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { addDoc, collection, deleteField, doc, updateDoc } from 'firebase/firestore';
import { deleteObject, getDownloadURL, ref, uploadBytesResumable } from 'firebase/storage';
import { format } from 'date-fns';
import { Check, Globe, RefreshCw, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { useFirestore, useStorage } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { colourFromImageUrl } from '@/lib/icon-colour';
import { IconMark, iconGlow, stageBackground } from '@/components/apps/icon-mark';
import {
  APP_PLATFORMS,
  FALLBACK_ICON_COLOR,
  isHexColour,
  STATUS_LABEL,
  type App,
  type AppKind,
  type AppStatus,
  type ShowcaseImage,
  type ShowcaseSection,
} from '@/lib/showcase';
import { ImagePicker, toDraft, toSaved, useImageReader, type DraftImage } from './image-fields';
import { SectionEditor, type DraftSection } from './section-editor';
import { Segmented } from './segmented';

const formSchema = z.object({
  title: z.string().trim().min(2, 'Give it a name.'),
  slug: z
    .string()
    .trim()
    .min(2, 'The address needs at least 2 characters.')
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Lowercase letters, numbers and single dashes only.'),
  kind: z.enum(['app', 'website']),
  status: z.enum(['live', 'testflight', 'decommissioned']),
  tagline: z.string().trim().max(140, 'Keep it to 140 characters or fewer.'),
  description: z.string(),
  link: z
    .string()
    .trim()
    .refine((v) => v === '' || /^https?:\/\/\S+\.\S+/i.test(v), 'Must be a full address starting with https://'),
  releaseDate: z.string().min(1, 'Pick the launch date.'),
  decommissionedDate: z.string(),
  platforms: z.array(z.string()),
  tags: z.string(),
});

type FormValues = z.infer<typeof formSchema>;

function slugify(text: string): string {
  return text
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const today = () => format(new Date(), 'yyyy-MM-dd');
/** A stored date as a yyyy-mm-dd for the date picker (empty when there isn't one). */
const dateInput = (value: string) => (/^\d{4}-\d{2}-\d{2}/.test(value) ? value.slice(0, 10) : '');

function toDraftSections(sections: ShowcaseSection[]): DraftSection[] {
  return sections.map((s) =>
    s.type === 'gallery'
      ? { ...s, images: s.images.map(toDraft) }
      : { ...s, image: s.image ? toDraft(s.image) : null }
  );
}

function uploadFile(storage: NonNullable<ReturnType<typeof useStorage>>, path: string, file: File): Promise<string> {
  const task = uploadBytesResumable(ref(storage, path), file, { contentType: file.type });
  return new Promise((resolve, reject) => {
    task.on('state_changed', undefined, reject, async () => resolve(await getDownloadURL(task.snapshot.ref)));
  });
}

const isStorageUrl = (url: string) => url.includes('firebasestorage.googleapis.com');

/** Best effort: a file that is already gone, or can't be removed, never blocks a save. */
async function deleteStorageFiles(storage: NonNullable<ReturnType<typeof useStorage>>, urls: string[]) {
  await Promise.all(
    urls.filter(isStorageUrl).map((url) =>
      deleteObject(ref(storage, url)).catch((error) => {
        if (error?.code !== 'storage/object-not-found') console.warn('Could not delete', url, error);
      })
    )
  );
}

interface AppFormProps {
  /** The entry being edited, or null for a new one. */
  app: App | null;
  /** The kind a new entry starts as. */
  defaultKind?: AppKind;
  /** Addresses other entries already use. */
  takenSlugs: string[];
  onFinished: () => void;
}

export function AppForm({ app, defaultKind = 'app', takenSlugs, onFinished }: AppFormProps) {
  const firestore = useFirestore();
  const storage = useStorage();
  const { toast } = useToast();
  const readImage = useImageReader();

  const [icon, setIcon] = useState<DraftImage | null>(() => (app?.icon ? toDraft(app.icon) : null));
  const [sections, setSections] = useState<DraftSection[]>(() => (app ? toDraftSections(app.sections) : []));
  // The icon's dominant colour: picked from the file when it's chosen, and editable.
  const [iconColor, setIconColor] = useState(app?.iconColor ?? '');
  const [iconError, setIconError] = useState('');
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [saving, setSaving] = useState(false);
  // An existing entry keeps its address: it's the page's URL. A new one follows the title until edited.
  const [slugTouched, setSlugTouched] = useState(!!app);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: app?.title ?? '',
      slug: app?.slug ?? '',
      kind: app?.kind ?? defaultKind,
      status: app?.status ?? 'live',
      tagline: app?.tagline ?? '',
      description: app?.description ?? '',
      link: app?.link ?? '',
      releaseDate: dateInput(app?.releaseDate ?? '') || today(),
      decommissionedDate: dateInput(app?.decommissionedDate ?? ''),
      platforms: app?.platforms ?? [],
      tags: app?.tags.join(', ') ?? '',
    },
  });

  const kind = form.watch('kind');
  const status = form.watch('status');
  const isApp = kind === 'app';

  const linkCopy = useMemo(() => {
    if (status === 'decommissioned') return { label: 'Link', placeholder: 'https://', note: 'Not shown on the page while decommissioned.' };
    if (!isApp) return { label: 'Website address', placeholder: 'https://example.com', note: 'The page links here with a "Visit website" button.' };
    if (status === 'testflight') return { label: 'TestFlight invite link', placeholder: 'https://testflight.apple.com/join/…', note: 'The page shows a "Join the TestFlight" button.' };
    return { label: 'App Store link', placeholder: 'https://apps.apple.com/…', note: 'The page shows a "View on the App Store" button.' };
  }, [isApp, status]);

  const changeKind = (next: AppKind) => {
    form.setValue('kind', next, { shouldDirty: true });
    if (next === 'website') {
      // Websites have no TestFlight and no platform list.
      if (form.getValues('status') === 'testflight') form.setValue('status', 'live');
      form.setValue('platforms', []);
    }
  };

  const changeStatus = (next: AppStatus) => {
    form.setValue('status', next, { shouldDirty: true });
    if (next === 'decommissioned' && !form.getValues('decommissionedDate')) form.setValue('decommissionedDate', today());
  };

  const ICON_REQUIRED = 'An icon is required: it is the face of the card and of the page.';

  const pickIcon = (next: DraftImage | null) => {
    setIcon(next);
    if (next) {
      setIconError('');
      colourFromImageUrl(next.url).then((colour) => colour && setIconColor(colour));
    } else {
      setIconColor('');
    }
  };

  // An icon saved before colours existed: read its colour once, if the browser is allowed to.
  useEffect(() => {
    if (app?.icon && !app.iconColor) {
      colourFromImageUrl(app.icon.url).then((colour) => colour && setIconColor((current) => current || colour));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSubmit = async (values: FormValues) => {
    if (!firestore || !storage) return;
    if (!icon) {
      setIconError(ICON_REQUIRED);
      return;
    }
    if (takenSlugs.includes(values.slug)) {
      form.setError('slug', { message: 'Another entry already uses this address.' });
      return;
    }

    setSaving(true);
    setIconError('');
    const uploaded: string[] = [];
    try {
      const pending = [icon, ...sections.flatMap((s) => (s.type === 'gallery' ? s.images : [s.image]))].filter(
        (d): d is DraftImage => !!d?.file
      );
      let done = 0;
      setProgress({ done, total: pending.length });

      const settle = async (draft: DraftImage | null, folder: string): Promise<ShowcaseImage | null> => {
        if (!draft) return null;
        if (!draft.file) return toSaved(draft);
        const safeName = draft.file.name.replace(/[^\w.-]+/g, '_');
        const url = await uploadFile(storage, `apps/${folder}/${Date.now()}_${Math.random().toString(36).slice(2, 7)}_${safeName}`, draft.file);
        uploaded.push(url);
        setProgress({ done: ++done, total: pending.length });
        return { url, width: draft.width, height: draft.height };
      };

      const [finalIcon, ...finalSections] = await Promise.all([
        settle(icon, 'icon'),
        ...sections.map(async (s): Promise<ShowcaseSection | null> => {
          if (s.type === 'gallery') {
            const images = (await Promise.all(s.images.map((i) => settle(i, 'screens')))).filter((i): i is ShowcaseImage => !!i);
            return images.length ? { id: s.id, type: 'gallery', title: s.title.trim(), images } : null;
          }
          const image = await settle(s.image, 'screens');
          const title = s.title.trim();
          const body = s.body.trim();
          return title || body || image ? { id: s.id, type: 'feature', title, body, textSide: s.textSide, image } : null;
        }),
      ]);
      const keptSections = finalSections.filter((s): s is ShowcaseSection => !!s);

      const data = {
        title: values.title,
        slug: values.slug,
        kind: values.kind,
        status: values.status,
        tagline: values.tagline,
        description: values.description.trim(),
        link: values.link,
        releaseDate: values.releaseDate,
        decommissionedDate: values.status === 'decommissioned' ? values.decommissionedDate : '',
        platforms: values.kind === 'app' ? values.platforms : [],
        tags: values.tags.split(',').map((t) => t.trim()).filter(Boolean),
        icon: finalIcon,
        iconColor: isHexColour(iconColor) ? iconColor.toLowerCase() : '',
        sections: keptSections,
        order: app?.order ?? null,
      };

      if (app) {
        // The old admin's availability and flat gallery are now status and a gallery section,
        // and a cover screenshot (no longer used) goes.
        await updateDoc(doc(firestore, 'apps', app.id), { ...data, availability: deleteField(), galleryImages: deleteField(), coverImage: deleteField() });
      } else {
        await addDoc(collection(firestore, 'apps'), data);
      }

      // Only now that the entry is saved, drop the pictures it no longer uses.
      if (app) {
        const before = [app.coverImage?.url, app.icon?.url, ...app.sections.flatMap((s) => (s.type === 'gallery' ? s.images.map((i) => i.url) : [s.image?.url]))];
        const after = new Set([finalIcon?.url, ...keptSections.flatMap((s) => (s.type === 'gallery' ? s.images.map((i) => i.url) : [s.image?.url]))]);
        await deleteStorageFiles(storage, before.filter((u): u is string => !!u && !after.has(u)));
      }

      toast({ title: app ? 'Saved.' : `${isApp ? 'App' : 'Website'} added.` });
      onFinished();
    } catch (error) {
      console.error('Saving app failed:', error);
      // Pictures uploaded for a save that didn't happen would be orphans.
      await deleteStorageFiles(storage, uploaded);
      const code = (error as { code?: string } | null)?.code;
      toast({
        variant: 'destructive',
        title: 'Could not save',
        description: code ? `Something went wrong (${code}).` : (error as Error)?.message || 'Something went wrong.',
      });
    } finally {
      setSaving(false);
      setProgress(null);
    }
  };

  return (
    <Form {...form}>
      <form
        // A missing icon is reported together with any other problems, not after them.
        onSubmit={form.handleSubmit(onSubmit, () => { if (!icon) setIconError(ICON_REQUIRED); })}
        className="min-w-0 space-y-8"
        noValidate
      >
        {/* What it is */}
        <div className="space-y-6">
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-2">
              <p className="text-sm font-medium leading-none">Type</p>
              <Segmented
                label="Type"
                value={kind}
                onChange={changeKind}
                options={[
                  { value: 'app', label: <><Smartphone className="h-4 w-4" /> App</> },
                  { value: 'website', label: <><Globe className="h-4 w-4" /> Website</> },
                ]}
              />
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium leading-none">Status</p>
              <Segmented
                label="Status"
                value={status}
                onChange={changeStatus}
                options={[
                  { value: 'live', label: STATUS_LABEL.live },
                  { value: 'testflight', label: STATUS_LABEL.testflight, disabled: !isApp, title: isApp ? undefined : 'Websites have no TestFlight' },
                  { value: 'decommissioned', label: STATUS_LABEL.decommissioned },
                ]}
              />
            </div>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={isApp ? 'Cuppi' : 'My Portfolio'}
                      {...field}
                      onChange={(e) => {
                        field.onChange(e);
                        if (!slugTouched) form.setValue('slug', slugify(e.target.value), { shouldValidate: form.formState.isSubmitted });
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="slug"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Page address</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={isApp ? 'cuppi' : 'my-portfolio'}
                      {...field}
                      onChange={(e) => {
                        field.onChange(e);
                        // Emptying the field hands control back to the name.
                        setSlugTouched(e.target.value !== '');
                      }}
                    />
                  </FormControl>
                  <FormDescription>
                    …/apps/<span className="font-medium">{form.watch('slug') || 'address'}</span>
                    {app ? ' Changing it breaks existing links.' : ''}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="tagline"
            render={({ field }) => (
              <FormItem>
                <FormLabel>One-line summary</FormLabel>
                <FormControl>
                  <Input placeholder="Shown on the card" {...field} />
                </FormControl>
                <FormDescription>{field.value.length}/140. Left empty, the start of the description is used.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Textarea rows={5} placeholder="The intro at the top of its page." {...field} />
                </FormControl>
                <FormDescription>A blank line starts a new paragraph.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Icon and its colour */}
        <div className="space-y-4 rounded-lg border p-5">
          <div>
            <h3 className="font-medium">{isApp ? 'Icon' : 'Logo'} &amp; colour</h3>
            <p className="text-sm text-muted-foreground">
              The {isApp ? 'icon' : 'logo'} is the face of the card and of the page. Its main colour is picked for you and tints the backgrounds around it.
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-[auto_1fr]">
            <ImagePicker
              label={isApp ? 'App icon' : 'Logo'}
              required
              shape="square"
              value={icon}
              onChange={pickIcon}
              readImage={readImage}
              error={iconError}
              hint={isApp ? 'A square picture, 1024 × 1024 if you have it.' : 'Shown whole, at its own proportions.'}
            />
            <div className="space-y-3">
              <p className="text-sm font-medium leading-none">Background colour</p>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="color"
                  aria-label="Background colour"
                  value={isHexColour(iconColor) ? iconColor : FALLBACK_ICON_COLOR}
                  onChange={(e) => setIconColor(e.target.value)}
                  className="h-9 w-12 cursor-pointer rounded-md border bg-transparent p-1"
                />
                <Input
                  aria-label="Background colour as a hex code"
                  value={iconColor}
                  placeholder={FALLBACK_ICON_COLOR}
                  maxLength={7}
                  onChange={(e) => setIconColor(e.target.value.trim())}
                  className="w-28 font-mono"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!icon}
                  onClick={async () => {
                    if (!icon) return;
                    const colour = await colourFromImageUrl(icon.url);
                    if (colour) setIconColor(colour);
                    else toast({ title: 'Could not read the icon', description: 'Pick the colour by hand instead.' });
                  }}
                >
                  <RefreshCw className="mr-2 h-4 w-4" /> Pick from icon
                </Button>
              </div>
              {iconColor && !isHexColour(iconColor) && (
                <p className="text-sm font-medium text-destructive">Use a hex code like #1ea08c, or clear it.</p>
              )}
              {/* What the card's top will look like */}
              <div
                className="relative flex h-32 max-w-xs items-center justify-center overflow-hidden rounded-lg border"
                style={{ background: stageBackground(isHexColour(iconColor) ? iconColor : '') }}
              >
                {icon ? (
                  <IconMark
                    kind={kind}
                    icon={icon}
                    sizes="96px"
                    className={isApp ? 'h-20 w-20' : 'h-14 max-w-[60%]'}
                    style={iconGlow(isHexColour(iconColor) ? iconColor : '', 40)}
                  />
                ) : (
                  <span className="text-xs text-white/50">Preview of the card</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Details */}
        <div className="space-y-6 rounded-lg border p-5">
          <h3 className="font-medium">Details</h3>
          <FormField
            control={form.control}
            name="link"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{linkCopy.label}</FormLabel>
                <FormControl>
                  <Input type="url" placeholder={linkCopy.placeholder} {...field} />
                </FormControl>
                <FormDescription>{linkCopy.note}</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="grid gap-6 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="releaseDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Launched</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {status === 'decommissioned' && (
              <FormField
                control={form.control}
                name="decommissionedDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Decommissioned</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </div>
          {isApp && (
            <FormField
              control={form.control}
              name="platforms"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Platforms</FormLabel>
                  <div className="flex flex-wrap gap-2">
                    {APP_PLATFORMS.map((platform) => {
                      const on = field.value.includes(platform);
                      return (
                        <button
                          key={platform}
                          type="button"
                          aria-pressed={on}
                          onClick={() => field.onChange(on ? field.value.filter((p) => p !== platform) : [...field.value, platform])}
                          className={cn(
                            'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm transition-colors',
                            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                            on ? 'border-primary bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                          )}
                        >
                          {on && <Check className="h-3.5 w-3.5" />}
                          {platform}
                        </button>
                      );
                    })}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
          <FormField
            control={form.control}
            name="tags"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tags</FormLabel>
                <FormControl>
                  <Input placeholder="SwiftUI, Firebase, Next.js" {...field} />
                </FormControl>
                <FormDescription>Comma-separated. Shown as coloured chips on the page.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* The page body */}
        <div className="space-y-4 rounded-lg border p-5">
          <div>
            <h3 className="font-medium">Page sections</h3>
            <p className="text-sm text-muted-foreground">
              What goes below the intro, top to bottom: rows of screenshots, or text beside a screenshot.
            </p>
          </div>
          <SectionEditor sections={sections} onChange={setSections} readImage={readImage} kind={kind} />
        </div>

        {progress && progress.total > 0 && (
          <div className="space-y-2">
            <Progress value={(progress.done / progress.total) * 100} />
            <p className="text-sm text-muted-foreground">
              Uploading pictures: {progress.done} of {progress.total}
            </p>
          </div>
        )}

        <div className="sticky bottom-0 -mx-6 -mb-6 flex items-center justify-end gap-3 border-t bg-background/95 px-6 py-4 backdrop-blur">
          {Object.keys(form.formState.errors).length > 0 && (
            <p className="mr-auto text-sm text-destructive">Some fields need attention.</p>
          )}
          <Button type="button" variant="outline" onClick={onFinished} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? 'Saving…' : app ? 'Save changes' : `Add ${isApp ? 'app' : 'website'}`}
          </Button>
        </div>
      </form>
    </Form>
  );
}
