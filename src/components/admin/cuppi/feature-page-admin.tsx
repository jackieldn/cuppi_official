'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { deleteField, doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { getDownloadURL, ref as storageRef, uploadBytes } from 'firebase/storage';
import { ArrowDown, ArrowLeft, ArrowUp, Clapperboard, Copy, GalleryHorizontal, Image as ImageIcon, ListChecks, MoreHorizontal, PanelsTopLeft, Plus, Quote, Smartphone, Trash2 } from 'lucide-react';
import { useDoc, useFirestore, useStorage } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { InstantReveal } from '@/components/ui/reveal';
import { useToast } from '@/hooks/use-toast';
import { BlockRenderer } from '@/components/cuppi/blocks/block-renderer';
import { FeatureHero } from '@/components/cuppi/blocks/feature-hero';
import { featuresSeed } from '@/lib/features-seed';
import {
  SECTION_LIMITS,
  SECTION_TEMPLATES,
  blockUrls,
  copySection,
  mapBlockUrls,
  newSection,
  sectionName,
  sectionSummary,
  validateSections,
  type SectionType,
} from '@/lib/feature-sections';
import { hasPage, mergeFeatures, readOverride, type FeatureBlock, type PageFeature } from '@/lib/features-types';
import { cn } from '@/lib/utils';
import { describeError } from './errors';
import { ScaledToFit } from './scaled-to-fit';
import { SectionForm } from './section-forms';
import { UploadsContext, type AddFile } from './section-fields';

const MAX_IMAGE = 10 * 1024 * 1024;
const MAX_VIDEO = 200 * 1024 * 1024;
const VIDEO_TYPES = /^video\/(mp4|webm|quicktime)$/;

const SECTION_ICONS: Record<SectionType, typeof Smartphone> = {
  showcase: Smartphone,
  tabs: PanelsTopLeft,
  banner: ImageIcon,
  video: Clapperboard,
  cards: GalleryHorizontal,
  callout: Quote,
  points: ListChecks,
};

/**
 * Builds the sections of one feature page: a live preview on the left (the page as the site draws
 * it), the sections on the right. Sections are added by choosing a template. Saved into the
 * feature's own document (cuppi_features/{slug}, field `blocks`), which the site merges over the
 * built-in page, so a built-in feature keeps its original sections until the first save here.
 */
export function FeaturePageAdmin({ slug }: { slug: string }) {
  const firestore = useFirestore();
  const storage = useStorage();
  const ref = useMemo(() => (firestore ? doc(firestore, 'cuppi_features', slug) : null), [firestore, slug]);
  const { data, isLoading } = useDoc<Record<string, unknown>>(ref);

  // The editor is started once, from what was saved when the page opened. It keeps its own copy from then
  // on, so the saves it makes itself do not start it over.
  const start = useRef<{ feature: PageFeature | null; original: FeatureBlock[]; customised: boolean } | null>(null);
  if (!isLoading && !start.current) {
    const override = data ? readOverride(slug, data) : null;
    const feature = mergeFeatures(featuresSeed, override ? [override] : []).find((f) => f.slug === slug);
    const seed = featuresSeed.find((f) => f.slug === slug);
    start.current = {
      feature: feature && hasPage(feature) ? feature : null,
      original: seed?.blocks ?? [],
      customised: Array.isArray(data?.blocks),
    };
  }

  if (isLoading || !start.current) return <Skeleton className="h-96 w-full" />;
  const { feature, original, customised } = start.current;
  if (!feature) {
    return (
      <div className="space-y-3 rounded-lg border border-dashed p-6 text-sm">
        <p>
          There is no feature page at <code>/features/{slug}</code> to build. A feature needs a headline and a picture before it has a page: add them with Edit on the features list.
        </p>
        <Button asChild variant="outline" size="sm">
          <Link href="/admin/cuppi-features">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to the features
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <FeaturePageEditor
      feature={feature}
      original={original}
      customised={customised}
      onSave={async (blocks) => {
        if (!ref) throw new Error('The database is not ready yet.');
        // JSON round trip: Firestore refuses `undefined`, and a draft can carry a few.
        await setDoc(ref, { blocks: JSON.parse(JSON.stringify(blocks)), updatedAt: serverTimestamp() }, { merge: true });
      }}
      onReset={async () => {
        if (!ref) throw new Error('The database is not ready yet.');
        await setDoc(ref, { blocks: deleteField(), updatedAt: serverTimestamp() }, { merge: true });
      }}
      upload={async (file, kind) => {
        if (!storage) throw new Error('Storage is not ready yet.');
        const r = storageRef(storage, `cuppi_features/${slug}/sections/${kind}-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`);
        await uploadBytes(r, file, { contentType: file.type });
        return getDownloadURL(r);
      }}
    />
  );
}

/** The builder. It knows nothing about the database: it is given the page, what is saved, and ways to save, reset and upload. */
export function FeaturePageEditor({
  feature,
  original,
  customised,
  onSave,
  onReset,
  upload,
}: {
  feature: PageFeature;
  /** The sections the page was built with in code. "Start again" goes back to these. */
  original: FeatureBlock[];
  /** Whether the admin has already saved sections of their own. */
  customised: boolean;
  onSave: (blocks: FeatureBlock[]) => Promise<void>;
  onReset: () => Promise<void>;
  upload: (file: File, kind: 'image' | 'video') => Promise<string>;
}) {
  const { toast } = useToast();
  const [blocks, setBlocks] = useState<FeatureBlock[]>(feature.blocks);
  const [saved, setSaved] = useState<FeatureBlock[]>(feature.blocks);
  const [isCustom, setIsCustom] = useState(customised);
  const [selected, setSelected] = useState<string | null>(feature.blocks[0]?.id ?? null);
  const [picker, setPicker] = useState<{ after: string | null } | null>(null);
  const [problems, setProblems] = useState<string[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  const dirty = JSON.stringify(blocks) !== JSON.stringify(saved);

  // Files chosen but not uploaded yet, by the local address the preview shows them at.
  const files = useRef(new Map<string, { file: File; kind: 'image' | 'video' }>());
  useEffect(() => {
    const held = files.current;
    return () => held.forEach((_, url) => URL.revokeObjectURL(url));
  }, []);
  const addFile = useCallback<AddFile>(
    (file, kind) => {
      const refuse = (description: string) => {
        toast({ variant: 'destructive', title: 'Cannot use that file', description });
        return null;
      };
      if (kind === 'image' && !file.type.startsWith('image/')) return refuse(`${file.name} is not a picture.`);
      if (kind === 'image' && file.size >= MAX_IMAGE) return refuse(`${file.name} is over 10 MB.`);
      if (kind === 'video' && !VIDEO_TYPES.test(file.type)) return refuse(`${file.name} is not an MP4, WebM or MOV video.`);
      if (kind === 'video' && file.size >= MAX_VIDEO) return refuse(`${file.name} is over 200 MB. Upload it to YouTube and paste the link instead.`);
      const url = URL.createObjectURL(file);
      files.current.set(url, { file, kind });
      return url;
    },
    [toast],
  );

  // Selecting from the list scrolls the preview to that section; clicking a section in the preview scrolls the list.
  const scroll = useRef<'preview' | 'form' | null>(null);
  const select = (id: string | null, where: 'preview' | 'form' | null) => {
    scroll.current = id ? where : null;
    setSelected(id);
  };
  useEffect(() => {
    if (!selected || !scroll.current) return;
    const kind = scroll.current;
    scroll.current = null;
    const id = kind === 'preview' ? `preview-${selected}` : `form-${selected}`;
    const t = setTimeout(() => document.getElementById(id)?.scrollIntoView({ block: kind === 'form' ? 'start' : 'center', behavior: 'smooth' }), 60);
    return () => clearTimeout(t);
  }, [selected]);

  const update = (id: string, patch: Partial<FeatureBlock>) => setBlocks((bs) => bs.map((b) => (b.id === id ? ({ ...b, ...patch } as FeatureBlock) : b)));
  const move = (index: number, by: -1 | 1) =>
    setBlocks((bs) => {
      const next = [...bs];
      const [x] = next.splice(index, 1);
      next.splice(index + by, 0, x);
      return next;
    });
  const remove = (b: FeatureBlock) => {
    if (!window.confirm(`Remove this ${sectionName(b.type).toLowerCase()} section? You can still leave without saving to get it back.`)) return;
    setBlocks((bs) => bs.filter((x) => x.id !== b.id));
    if (selected === b.id) setSelected(null);
  };
  const duplicate = (b: FeatureBlock) => {
    const copy = copySection(b);
    setBlocks((bs) => {
      const next = [...bs];
      next.splice(bs.findIndex((x) => x.id === b.id) + 1, 0, copy);
      return next;
    });
    select(copy.id, 'preview');
  };
  const add = (type: SectionType) => {
    const fresh = newSection(type);
    const after = picker?.after;
    setBlocks((bs) => {
      const at = after ? bs.findIndex((x) => x.id === after) + 1 : bs.length;
      const next = [...bs];
      next.splice(at, 0, fresh);
      return next;
    });
    setPicker(null);
    select(fresh.id, 'form');
  };

  const save = async () => {
    const found = validateSections(blocks);
    setProblems(found);
    if (found.length > 0) return;
    try {
      // Pictures and videos chosen here are still on this computer: send them up, then swap in their new addresses.
      const pending = [...new Set(blockUrls(blocks).filter((u) => u.startsWith('blob:')))];
      const sent = new Map<string, string>();
      for (const [n, local] of pending.entries()) {
        const held = files.current.get(local);
        if (!held) throw new Error('A chosen file is no longer available. Choose it again.');
        setBusy(`Uploading ${n + 1} of ${pending.length}${held.kind === 'video' ? ' (video: this can take a while)' : ''}…`);
        sent.set(local, await upload(held.file, held.kind));
      }
      setBusy('Saving…');
      const final = sent.size ? mapBlockUrls(blocks, (u) => sent.get(u) ?? u) : blocks;
      await onSave(final);
      sent.forEach((_, local) => {
        URL.revokeObjectURL(local);
        files.current.delete(local);
      });
      setBlocks(final);
      setSaved(final);
      setIsCustom(true);
      toast({ title: 'Page saved', description: 'The site picks it up within a minute.' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Could not save the page', description: describeError(error) });
    } finally {
      setBusy(null);
    }
  };

  const startAgain = async () => {
    const ask = original.length > 0 ? 'Throw away every change to the sections and go back to how this page was built?' : 'Remove every section from this page?';
    if (!window.confirm(ask)) return;
    try {
      setBusy('Resetting…');
      await onReset();
      setBlocks(original);
      setSaved(original);
      setIsCustom(false);
      setProblems([]);
      setSelected(original[0]?.id ?? null);
      toast({ title: 'Sections reset' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Could not reset', description: describeError(error) });
    } finally {
      setBusy(null);
    }
  };

  // Leaving with unsaved changes would lose them, and picked files with them.
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const preview: PageFeature = useMemo(() => ({ ...feature, blocks }), [feature, blocks]);
  const wrap = (b: FeatureBlock, node: ReactNode) => (
    <div
      id={`preview-${b.id}`}
      onClick={() => select(b.id, 'form')}
      className={cn('cursor-pointer rounded-[2.5rem] outline outline-[6px] -outline-offset-[6px] transition-[outline-color]', selected === b.id ? 'outline-primary/70' : 'outline-transparent hover:outline-primary/25')}
    >
      {node}
    </div>
  );

  return (
    <UploadsContext.Provider value={addFile}>
      {/* Two columns from lg up, like the home hero editor: the preview stays in view while the sections scroll. */}
      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:h-full lg:grid-cols-[minmax(0,1.5fr)_minmax(380px,1fr)]">
        <div className="min-w-0 lg:overflow-y-auto">
          <div className="mb-2 flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Preview</h2>
            <Button asChild variant="ghost" size="sm">
              <Link href={`/features/${feature.slug}`} target="_blank">
                See the live page
              </Link>
            </Button>
          </div>
          {/* eslint-disable-next-line @next/next/no-page-custom-font */}
          <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400..700&family=DM+Serif+Display:ital@0;1&display=swap" />
          <div
            className="theme-cuppi font-body rounded-xl border bg-cuppi-paper text-cuppi-ink"
            // Links in the preview must not carry the admin away from unsaved work.
            onClickCapture={(e) => {
              if ((e.target as HTMLElement).closest('a')) e.preventDefault();
            }}
          >
            <ScaledToFit designWidth={1200}>
              <InstantReveal>
                <div className="pb-3">
                  <FeatureHero feature={preview} />
                  {blocks.length === 0 ? (
                    <p className="mx-auto my-16 max-w-md rounded-[2rem] border-2 border-dashed border-cuppi-line px-6 py-12 text-center text-xl text-cuppi-ink-soft">No sections yet. Add one from the right and it appears here.</p>
                  ) : (
                    <BlockRenderer blocks={blocks} wrap={wrap} />
                  )}
                </div>
              </InstantReveal>
            </ScaledToFit>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Drawn at desktop width and scaled to fit. Click a section to edit it. The top of the page, and the “Keep exploring” and Download strips under it, are not part of the sections.
          </p>
        </div>

        <div className="flex min-h-0 min-w-0 flex-col">
          <div className="space-y-6 lg:flex-1 lg:overflow-y-auto lg:pr-2">
            <Card>
              <CardHeader>
                <CardTitle>Sections</CardTitle>
                <CardDescription>The page below its top block, in order. Add a section by choosing a template.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {blocks.length === 0 && <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">Nothing yet.</p>}
                {blocks.map((b, i) => {
                  const Icon = SECTION_ICONS[b.type];
                  const open = selected === b.id;
                  const summary = sectionSummary(b);
                  return (
                    <div key={b.id} id={`form-${b.id}`} className={cn('scroll-mt-2 rounded-lg border bg-card', open && 'border-primary ring-1 ring-primary')}>
                      <div className="flex items-center gap-1 pr-1">
                        <button
                          type="button"
                          aria-expanded={open}
                          onClick={() => select(open ? null : b.id, open ? null : 'preview')}
                          className="flex min-w-0 flex-1 items-center gap-3 rounded-lg px-3 py-2.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-muted">
                            <Icon className="h-4 w-4" aria-hidden />
                          </span>
                          <span className="min-w-0">
                            <span className="block text-sm font-medium">
                              {i + 1}. {sectionName(b.type)}
                            </span>
                            <span className={cn('block truncate text-xs', summary ? 'text-muted-foreground' : 'italic text-muted-foreground/70')}>{summary || 'Not filled in yet'}</span>
                          </span>
                        </button>
                        <IconButton label={`Move section ${i + 1} up`} disabled={i === 0} onClick={() => move(i, -1)}>
                          <ArrowUp className="h-4 w-4" />
                        </IconButton>
                        <IconButton label={`Move section ${i + 1} down`} disabled={i === blocks.length - 1} onClick={() => move(i, 1)}>
                          <ArrowDown className="h-4 w-4" />
                        </IconButton>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" aria-label={`More for section ${i + 1}`} title="More">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem disabled={blocks.length >= SECTION_LIMITS.sections} onSelect={() => setPicker({ after: b.id })}>
                              <Plus className="mr-2 h-4 w-4" /> Add a section after this
                            </DropdownMenuItem>
                            <DropdownMenuItem disabled={blocks.length >= SECTION_LIMITS.sections} onSelect={() => duplicate(b)}>
                              <Copy className="mr-2 h-4 w-4" /> Duplicate
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={() => remove(b)}>
                              <Trash2 className="mr-2 h-4 w-4" /> Remove
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      {open && (
                        <div className="space-y-4 border-t p-4">
                          <SectionForm block={b} onChange={(patch) => update(b.id, patch)} />
                        </div>
                      )}
                    </div>
                  );
                })}
                <Button type="button" variant="outline" className="w-full" disabled={blocks.length >= SECTION_LIMITS.sections} onClick={() => setPicker({ after: null })}>
                  <Plus className="mr-2 h-4 w-4" /> Add a section
                </Button>
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

          {/* Outside the scrolling sections, so Save is always in reach. */}
          <div className="sticky bottom-0 flex flex-wrap items-center gap-3 border-t bg-background/95 py-3 backdrop-blur lg:static">
            <Button onClick={save} disabled={!!busy || !dirty}>
              {busy ?? 'Save page'}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={!!busy || !dirty}
              onClick={() => {
                setBlocks(saved);
                setProblems([]);
              }}
            >
              Discard changes
            </Button>
            {(isCustom || original.length === 0) && (
              <Button type="button" variant="ghost" disabled={!!busy || (!isCustom && blocks.length === 0)} onClick={startAgain}>
                {original.length > 0 ? 'Start again from the original' : 'Remove all sections'}
              </Button>
            )}
            {dirty && !busy && <span className="text-sm text-muted-foreground">Unsaved changes</span>}
          </div>
        </div>
      </div>

      <Dialog open={!!picker} onOpenChange={(o) => !o && setPicker(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add a section</DialogTitle>
            <DialogDescription>Choose a template. It is added {picker?.after ? 'after the section you picked' : 'at the end of the page'}, ready to fill in.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            {SECTION_TEMPLATES.map((t) => (
              <button
                key={t.type}
                type="button"
                onClick={() => add(t.type)}
                className="rounded-lg border p-2 text-left transition-colors hover:border-primary hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <SectionThumb type={t.type} />
                <p className="mt-3 text-sm font-semibold">{t.name}</p>
                <p className="text-xs text-muted-foreground">{t.blurb}</p>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </UploadsContext.Provider>
  );
}

function IconButton({ label, children, className, ...props }: { label: string; children: ReactNode; className?: string; disabled?: boolean; onClick: () => void }) {
  return (
    <Button type="button" variant="ghost" size="icon" className={cn('h-8 w-8 shrink-0', className)} aria-label={label} title={label} {...props}>
      {children}
    </Button>
  );
}

/** A tiny drawing of each template: bars for words, rounded blocks for pictures. */
function SectionThumb({ type }: { type: SectionType }) {
  const bar = (w: string, strong = true) => <span className={cn('block h-1.5 rounded-full', strong ? 'bg-foreground/55' : 'bg-foreground/25')} style={{ width: w }} />;
  const pic = 'block rounded-md border-2 border-foreground/45 bg-foreground/10';
  let body: ReactNode;
  switch (type) {
    case 'showcase':
      body = (
        <div className="flex h-full gap-3">
          <div className="flex flex-1 flex-col justify-center gap-1.5">
            {bar('85%')}
            {bar('60%')}
            {bar('90%', false)}
            {bar('70%', false)}
          </div>
          <span className={cn(pic, 'h-[120%] w-2/5 self-end rounded-b-none')} />
        </div>
      );
      break;
    case 'tabs':
      body = (
        <div className="flex h-full gap-3">
          <div className="flex flex-1 flex-col justify-center gap-2">
            {bar('70%')}
            {bar('90%', false)}
            <span className="h-px bg-foreground/20" />
            {bar('55%')}
            <span className="h-px bg-foreground/20" />
            {bar('65%')}
          </div>
          <span className={cn(pic, 'w-2/5')} />
        </div>
      );
      break;
    case 'banner':
      body = (
        <div className="flex h-full flex-col gap-2">
          {bar('45%')}
          <span className={cn(pic, 'flex-1')} />
        </div>
      );
      break;
    case 'video':
      body = (
        <div className="flex h-full items-end justify-center gap-3">
          <span className={cn(pic, 'grid h-full w-3/5 place-items-center')}>
            <span className="h-0 w-0 border-y-[6px] border-l-[10px] border-y-transparent border-l-foreground/60" />
          </span>
          <span className={cn(pic, 'grid h-[130%] w-[22%] place-items-center')}>
            <span className="h-0 w-0 border-y-[4px] border-l-[7px] border-y-transparent border-l-foreground/60" />
          </span>
        </div>
      );
      break;
    case 'cards':
      body = (
        <div className="flex h-full gap-2">
          {[0, 1, 2].map((n) => (
            <span key={n} className={cn(pic, 'flex-1 rounded-b-none', n === 2 && 'opacity-50')} />
          ))}
        </div>
      );
      break;
    case 'callout':
      body = (
        <div className="grid h-full place-items-center rounded-md bg-foreground/10">
          <div className="flex w-3/4 flex-col items-center gap-1.5">
            {bar('90%')}
            {bar('55%')}
          </div>
        </div>
      );
      break;
    case 'points':
      body = (
        <div className="grid h-full grid-cols-2 gap-2">
          {[0, 1, 2, 3].map((n) => (
            <span key={n} className="flex flex-col justify-center gap-1.5 rounded-md border border-foreground/25 p-2">
              {bar('60%')}
              {bar('85%', false)}
            </span>
          ))}
        </div>
      );
      break;
  }
  return <div className="h-24 overflow-hidden rounded-md bg-muted p-3">{body}</div>;
}
