'use client';

import { useMemo, useState } from 'react';
import { collection, deleteDoc, doc, query, updateDoc, writeBatch } from 'firebase/firestore';
import { deleteObject, ref } from 'firebase/storage';
import { format } from 'date-fns';
import { ArrowDown, ArrowUp, ExternalLink, Globe, ImageIcon, Images, Palette, Plus, Smartphone, Square } from 'lucide-react';
import { useCollection, useFirestore, useStorage } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import {
  KIND_LABEL,
  KIND_PLURAL,
  STATUS_LABEL,
  STATUSES,
  normalizeApp,
  orderGroup,
  sortApps,
  yearOf,
  type App,
  type AppKind,
  type AppStatus,
} from '@/lib/showcase';
import { AppForm } from './app-form';

/** At-a-glance "is this filled out?" markers; faded when empty. */
function Marker({ icon: Icon, active, label, count }: {
  icon: React.ComponentType<{ className?: string }>;
  active: boolean;
  label: string;
  count?: number;
}) {
  return (
    <span
      title={label}
      aria-label={label}
      role="img"
      className={cn('inline-flex items-center gap-0.5 text-xs', active ? 'text-foreground' : 'text-muted-foreground/30')}
    >
      <Icon className="h-4 w-4" />
      {active && count !== undefined && count > 0 && <span>{count}</span>}
    </span>
  );
}

const sectionImageCount = (app: App) =>
  app.sections.reduce((n, s) => n + (s.type === 'gallery' ? s.images.length : s.image ? 1 : 0), 0);

type FormTarget = { app: App | null; kind: AppKind };

export function AppList() {
  const firestore = useFirestore();
  const storage = useStorage();
  const { toast } = useToast();
  const [target, setTarget] = useState<FormTarget | null>(null);

  const appsQuery = useMemo(() => (firestore ? query(collection(firestore, 'apps')) : null), [firestore]);
  const { data, isLoading } = useCollection<Record<string, any>>(appsQuery);

  const apps = useMemo(() => sortApps((data ?? []).map((d) => normalizeApp(d))), [data]);
  const groups = useMemo(
    () => (['app', 'website'] as AppKind[]).map((kind) => ({ kind, items: apps.filter((a) => a.kind === kind) })),
    [apps]
  );

  const takenSlugs = useMemo(
    () => apps.filter((a) => a.id !== target?.app?.id).map((a) => a.slug),
    [apps, target]
  );

  const handleStatus = async (app: App, status: AppStatus) => {
    if (!firestore || status === app.status) return;
    const patch: Record<string, string> = { status };
    // Retiring something dates it, unless it already has a date.
    if (status === 'decommissioned' && !app.decommissionedDate) patch.decommissionedDate = format(new Date(), 'yyyy-MM-dd');
    try {
      await updateDoc(doc(firestore, 'apps', app.id), patch);
      toast({ title: `${app.title} is now ${STATUS_LABEL[status].toLowerCase()}.` });
    } catch (error) {
      console.error('Status change failed:', error);
      toast({ variant: 'destructive', title: 'Could not change the status' });
    }
  };

  /** Swaps an entry with its neighbour among entries of the same kind and status. */
  const handleMove = async (app: App, delta: -1 | 1) => {
    if (!firestore) return;
    const peers = apps.filter((a) => orderGroup(a) === orderGroup(app));
    const from = peers.findIndex((a) => a.id === app.id);
    const to = from + delta;
    if (from < 0 || to < 0 || to >= peers.length) return;
    const next = [...peers];
    [next[from], next[to]] = [next[to], next[from]];
    try {
      // Number the whole group, so entries that never had an order get one.
      const batch = writeBatch(firestore);
      next.forEach((a, i) => batch.update(doc(firestore, 'apps', a.id), { order: i }));
      await batch.commit();
    } catch (error) {
      console.error('Reorder failed:', error);
      toast({ variant: 'destructive', title: 'Could not change the order' });
    }
  };

  const handleDelete = async (app: App) => {
    if (!firestore || !storage) return;
    if (!window.confirm(`Delete "${app.title}"? Its page and all its pictures are removed for good.`)) return;
    try {
      await deleteDoc(doc(firestore, 'apps', app.id));
      const urls = [
        app.coverImage?.url,
        app.icon?.url,
        ...app.sections.flatMap((s) => (s.type === 'gallery' ? s.images.map((i) => i.url) : [s.image?.url])),
      ].filter((u): u is string => !!u && u.includes('firebasestorage.googleapis.com'));
      await Promise.all(
        urls.map((url) =>
          deleteObject(ref(storage, url)).catch((error) => {
            if (error?.code !== 'storage/object-not-found') console.warn('Could not delete', url, error);
          })
        )
      );
      toast({ title: `${app.title} deleted.` });
    } catch (error) {
      console.error('Delete failed:', error);
      toast({ variant: 'destructive', title: 'Could not delete', description: (error as Error).message });
    }
  };

  return (
    <div className="space-y-10">
      <Dialog open={!!target} onOpenChange={(open) => { if (!open) setTarget(null); }}>
        <DialogContent
          className="max-h-[90vh] max-w-4xl overflow-y-auto"
          // Clicking outside would silently throw away an in-progress edit.
          onInteractOutside={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle className="font-headline text-2xl">
              {target?.app ? `Edit ${target.app.title}` : `Add ${target?.kind === 'website' ? 'a website' : 'an app'}`}
            </DialogTitle>
            <DialogDescription className="sr-only">
              {target?.app ? `Edit ${target.app.title}` : 'Add a new entry to the Apps & Websites page'}
            </DialogDescription>
          </DialogHeader>
          {target && (
            <AppForm
              app={target.app}
              defaultKind={target.kind}
              takenSlugs={takenSlugs}
              onFinished={() => setTarget(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="max-w-xl text-sm text-muted-foreground">
          What shows on the Apps &amp; Websites page. Live entries come first, then TestFlight, then decommissioned; use the
          arrows to order entries of the same kind and status.
        </p>
        <div className="flex gap-3">
          <Button onClick={() => setTarget({ app: null, kind: 'app' })}>
            <Plus className="mr-2 h-4 w-4" /> Add app
          </Button>
          <Button variant="outline" onClick={() => setTarget({ app: null, kind: 'website' })}>
            <Plus className="mr-2 h-4 w-4" /> Add website
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : (
        groups.map(({ kind, items }) => {
          const Icon = kind === 'app' ? Smartphone : Globe;
          return (
            <section key={kind} className="space-y-3">
              <h2 className="flex items-center gap-2 font-headline text-xl font-bold">
                <Icon className="h-5 w-5 text-muted-foreground" />
                {KIND_PLURAL[kind]}
                <span className="text-sm font-normal text-muted-foreground">{items.length}</span>
              </h2>
              {items.length === 0 ? (
                <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                  No {KIND_PLURAL[kind].toLowerCase()} yet.
                </p>
              ) : (
                <div className="rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-20">Order</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead className="w-44">Status</TableHead>
                        <TableHead className="w-20">Year</TableHead>
                        <TableHead className="w-28">Content</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map((app) => {
                        const peers = items.filter((a) => orderGroup(a) === orderGroup(app));
                        const at = peers.findIndex((a) => a.id === app.id);
                        return (
                          <TableRow key={app.id} className={cn(app.status === 'decommissioned' && 'text-muted-foreground')}>
                            <TableCell>
                              <span className="flex">
                                <Button variant="ghost" size="icon" className="h-8 w-8" disabled={at <= 0} aria-label={`Move ${app.title} up`} onClick={() => handleMove(app, -1)}>
                                  <ArrowUp className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8" disabled={at >= peers.length - 1} aria-label={`Move ${app.title} down`} onClick={() => handleMove(app, 1)}>
                                  <ArrowDown className="h-4 w-4" />
                                </Button>
                              </span>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <div
                                  className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-[22.5%] bg-muted"
                                  style={app.iconColor ? { backgroundColor: app.iconColor } : undefined}
                                >
                                  {app.icon ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={app.icon.url} alt="" className={cn('h-full w-full', app.kind === 'app' ? 'object-cover' : 'object-contain')} />
                                  ) : (
                                    <ImageIcon className="h-4 w-4 text-muted-foreground/50" />
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <p className="truncate font-medium">{app.title}</p>
                                  <p className="truncate text-xs text-muted-foreground">/apps/{app.slug}</p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Select value={app.status} onValueChange={(value) => handleStatus(app, value as AppStatus)}>
                                <SelectTrigger className="h-8" aria-label={`Status of ${app.title}`}>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {STATUSES.map((status) => (
                                    <SelectItem key={status} value={status} disabled={status === 'testflight' && app.kind === 'website'}>
                                      {STATUS_LABEL[status]}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell className="tabular-nums">
                              {yearOf(app.releaseDate) || <span className="text-muted-foreground/40">—</span>}
                            </TableCell>
                            <TableCell>
                              <span className="inline-flex items-center gap-2">
                                <Marker icon={Square} active={!!app.icon} label={app.icon ? 'Icon set' : 'No icon: the card shows a placeholder'} />
                                <Marker icon={Palette} active={!!app.iconColor} label={app.iconColor ? `Colour ${app.iconColor}` : 'No colour yet: open and save to pick one'} />
                                <Marker
                                  icon={Images}
                                  active={app.sections.length > 0}
                                  count={sectionImageCount(app)}
                                  label={app.sections.length ? `${app.sections.length} section${app.sections.length === 1 ? '' : 's'}, ${sectionImageCount(app)} picture${sectionImageCount(app) === 1 ? '' : 's'}` : 'No sections'}
                                />
                              </span>
                            </TableCell>
                            <TableCell className="space-x-2 text-right">
                              <Button asChild variant="ghost" size="icon" className="h-8 w-8">
                                <a href={`/apps/${app.slug}`} target="_blank" rel="noopener noreferrer" aria-label={`View ${app.title} on the site`} title="View on the site">
                                  <ExternalLink className="h-4 w-4" />
                                </a>
                              </Button>
                              <Button variant="outline" size="sm" onClick={() => setTarget({ app, kind: app.kind })}>
                                Edit
                              </Button>
                              <Button variant="destructive" size="sm" onClick={() => handleDelete(app)}>
                                Delete
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </section>
          );
        })
      )}
    </div>
  );
}
