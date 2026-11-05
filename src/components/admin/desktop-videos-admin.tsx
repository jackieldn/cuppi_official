'use client';

// Manages the videos on the desktop easter egg. Each is a link (YouTube or a
// video file) tagged with the era it shows up in: 2006 puts it in the fake
// BitTorrent client, 2026 puts it on the desktop as a video file. Both can be
// ticked. For 2006 you can also dress it up as a torrent: a messy file name, a
// size, seeds and peers, or make it a slow download that never quite finishes.

import { useMemo, useState } from 'react';
import {
  addDoc,
  collection,
  deleteDoc,
  deleteField,
  doc,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
import { ExternalLink, Pencil, XCircle } from 'lucide-react';

import { useCollection, useFirestore } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { videoSource } from '@/lib/desktop-video-source';
import {
  DESKTOP_VIDEOS,
  VIDEO_ERAS,
  etaSeconds,
  formatEta,
  formatSize,
  hasEra,
  torrentFacts,
  type DesktopVideo,
  type TorrentStatus,
  type VideoEra,
} from '@/lib/desktop-videos-types';

type Form = {
  title: string;
  url: string;
  eras: VideoEra[];
  torrentName: string;
  status: TorrentStatus;
  sizeMB: string;
  progress: string;
  downloadKBps: string;
  uploadKBps: string;
  seeds: string;
  peers: string;
};

const EMPTY: Form = {
  title: '',
  url: '',
  eras: ['2006'],
  torrentName: '',
  status: 'seeding',
  sizeMB: '',
  progress: '',
  downloadKBps: '',
  uploadKBps: '',
  seeds: '',
  peers: '',
};

const ERA_LABEL: Record<VideoEra, string> = {
  '2006': '2006 – torrent client',
  '2026': '2026 – desktop file',
};

const num = (text: string): number | undefined => {
  const n = Number.parseFloat(text);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
};

const formFrom = (v: DesktopVideo): Form => ({
  title: v.title ?? '',
  url: v.url ?? '',
  eras: v.eras ?? [],
  torrentName: v.torrentName ?? '',
  status: v.status ?? 'seeding',
  sizeMB: v.sizeMB?.toString() ?? '',
  progress: v.progress?.toString() ?? '',
  downloadKBps: v.downloadKBps?.toString() ?? '',
  uploadKBps: v.uploadKBps?.toString() ?? '',
  seeds: v.seeds?.toString() ?? '',
  peers: v.peers?.toString() ?? '',
});

/** What a download in progress needs no link for: nothing can play it yet. */
const needsLink = (f: Form) => !(f.status === 'downloading' && f.eras.length === 1 && f.eras[0] === '2006');

/** Why the form can't be saved yet, or null. */
function problem(f: Form): string | null {
  if (!f.title.trim()) return 'A title is required.';
  if (f.eras.length === 0) return 'Pick at least one era.';
  const url = f.url.trim();
  if (url && !videoSource(url)) return 'The link must be a YouTube link or an https address of a video file.';
  if (!url && needsLink(f)) return 'A link is required (only a 2006 download in progress can go without).';
  return null;
}

/**
 * The fields to save. Firestore rejects `undefined`, so blank optional fields
 * are left out on create and removed on update.
 */
function payload(f: Form, update: boolean) {
  const opt = <T,>(value: T | undefined | '') => (value === undefined || value === '' ? (update ? deleteField() : undefined) : value);
  const torrent = f.eras.includes('2006');
  const downloading = torrent && f.status === 'downloading';
  const data = {
    title: f.title.trim(),
    eras: VIDEO_ERAS.filter((e) => f.eras.includes(e)),
    url: opt(f.url.trim()),
    torrentName: opt(torrent ? f.torrentName.trim() : ''),
    status: opt(torrent ? f.status : undefined),
    sizeMB: opt(torrent ? num(f.sizeMB) : undefined),
    progress: opt(downloading ? num(f.progress) : undefined),
    downloadKBps: opt(downloading ? num(f.downloadKBps) : undefined),
    uploadKBps: opt(torrent && !downloading ? num(f.uploadKBps) : undefined),
    seeds: opt(torrent ? num(f.seeds) : undefined),
    peers: opt(torrent ? num(f.peers) : undefined),
  };
  return Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined));
}

function VideoFields({ id, form, onChange }: { id: string; form: Form; onChange: (f: Form) => void }) {
  const set = (patch: Partial<Form>) => onChange({ ...form, ...patch });
  const torrent = form.eras.includes('2006');
  const downloading = torrent && form.status === 'downloading';

  const text = (key: keyof Form, label: string, placeholder: string, extra?: React.ComponentProps<typeof Input>) => (
    <div className="space-y-2">
      <Label htmlFor={`${id}-${key}`}>{label}</Label>
      <Input
        id={`${id}-${key}`}
        value={form[key] as string}
        onChange={(e) => set({ [key]: e.target.value })}
        placeholder={placeholder}
        {...extra}
      />
    </div>
  );

  // What the torrent client will show for the time left, from the numbers typed so far.
  const facts = torrentFacts({
    id: 'preview',
    title: form.title || 'preview',
    eras: [],
    order: 0,
    status: form.status,
    sizeMB: num(form.sizeMB),
    progress: num(form.progress),
    downloadKBps: num(form.downloadKBps),
  });

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        {text('title', 'Title *', 'e.g. Crazy Frog – Axel F')}
        {text('url', 'Link *', 'https://www.youtube.com/watch?v=…', { type: 'url' })}
      </div>

      <fieldset className="space-y-2">
        <legend className="mb-1 text-sm font-medium leading-none">Shows up in *</legend>
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          {VIDEO_ERAS.map((era) => (
            <label key={era} className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={form.eras.includes(era)}
                onCheckedChange={(on) =>
                  set({ eras: on ? [...form.eras, era] : form.eras.filter((e) => e !== era) })
                }
              />
              {ERA_LABEL[era]}
            </label>
          ))}
        </div>
      </fieldset>

      {torrent && (
        <div className="space-y-4 rounded-md border bg-secondary/30 p-4">
          <p className="text-sm font-medium">2006 torrent details</p>
          <p className="-mt-2 text-xs text-muted-foreground">
            All optional: anything left blank is made up from the title, the same every time.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            {text('torrentName', 'File name in the client', 'e.g. Borat.2006.DVDRip.XviD-aXXo')}
            <div className="space-y-2">
              <Label htmlFor={`${id}-status`}>Status</Label>
              <Select value={form.status} onValueChange={(v) => set({ status: v as TorrentStatus })}>
                <SelectTrigger id={`${id}-status`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="seeding">Seeding (finished, playable)</SelectItem>
                  <SelectItem value="downloading">Downloading (slowly, not playable)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {text('sizeMB', 'Size (MB)', 'e.g. 700', { type: 'number', min: 1, step: 'any' })}
            {downloading
              ? text('progress', 'Done so far (%)', 'e.g. 12.5', { type: 'number', min: 0, max: 99.9, step: 'any' })
              : text('uploadKBps', 'Upload speed while seeding (kB/s)', 'e.g. 25', { type: 'number', min: 0, step: 'any' })}
            {downloading &&
              text('downloadKBps', 'Download speed (kB/s)', 'e.g. 35', { type: 'number', min: 0, step: 'any' })}
            {text('seeds', 'Seeds in the swarm', 'e.g. 14', { type: 'number', min: 0 })}
            {text('peers', 'Peers in the swarm', 'e.g. 6', { type: 'number', min: 0 })}
          </div>
          {downloading && (
            <p className="text-sm text-muted-foreground">
              At these numbers: {formatSize(facts.sizeMB)}, {facts.progress.toFixed(1)}% done, estimated time{' '}
              <span className="font-medium text-foreground">
                {formatEta(etaSeconds(facts.sizeMB, facts.progress, facts.downloadKBps))}
              </span>
              . Raise the size or lower the speed for a longer wait.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export function DesktopVideosAdmin() {
  const firestore = useFirestore();
  const { toast } = useToast();

  const [form, setForm] = useState<Form>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<DesktopVideo | null>(null);
  const [editForm, setEditForm] = useState<Form>(EMPTY);
  const [editOrder, setEditOrder] = useState('');

  const videosQuery = useMemo(
    () => (firestore ? query(collection(firestore, DESKTOP_VIDEOS), orderBy('order')) : null),
    [firestore],
  );
  const { data: videos, isLoading } = useCollection<DesktopVideo>(videosQuery);

  const handleAdd = async () => {
    if (!firestore) return;
    const issue = problem(form);
    if (issue) {
      toast({ variant: 'destructive', title: issue });
      return;
    }
    setSaving(true);
    try {
      const lastOrder = videos?.reduce((max, v) => Math.max(max, v.order ?? 0), 0) ?? 0;
      await addDoc(collection(firestore, DESKTOP_VIDEOS), {
        ...payload(form, false),
        order: lastOrder + 1,
        createdAt: serverTimestamp(),
      });
      toast({ title: 'Video added', description: `${form.title.trim()} is on the desktop.` });
      // Keep the era ticks: several videos in a row are usually for the same desktop.
      setForm({ ...EMPTY, eras: form.eras });
    } catch (error) {
      console.error('Video add failed:', error);
      toast({ variant: 'destructive', title: 'Could not add the video' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (video: DesktopVideo) => {
    if (!firestore) return;
    if (!window.confirm(`Delete "${video.title}"?`)) return;
    try {
      await deleteDoc(doc(firestore, DESKTOP_VIDEOS, video.id));
      toast({ title: 'Video deleted.' });
    } catch (error) {
      console.error('Video delete failed:', error);
      toast({ variant: 'destructive', title: 'Deletion failed', description: 'Could not delete the video.' });
    }
  };

  const openEdit = (video: DesktopVideo) => {
    setEditing(video);
    setEditForm(formFrom(video));
    setEditOrder(video.order?.toString() ?? '');
  };

  const handleSave = async () => {
    if (!editing || !firestore) return;
    const issue = problem(editForm);
    if (issue) {
      toast({ variant: 'destructive', title: issue });
      return;
    }
    const order = Number.parseInt(editOrder, 10);
    try {
      await updateDoc(doc(firestore, DESKTOP_VIDEOS, editing.id), {
        ...payload(editForm, true),
        order: Number.isFinite(order) ? order : editing.order,
      });
      toast({ title: 'Video updated!' });
      setEditing(null);
    } catch (error) {
      console.error('Video update failed:', error);
      toast({ variant: 'destructive', title: 'Update failed', description: 'Could not save changes.' });
    }
  };

  return (
    <div className="space-y-8">
      <div className="space-y-4 rounded-lg border p-8">
        <h2 className="font-headline text-2xl font-bold">Add a Video</h2>
        <p className="text-sm text-muted-foreground">
          Paste a YouTube link (or the https address of a video file) and pick the desktop it belongs on. In 2006 it
          appears in the torrent client and plays in the media player when double-clicked; in 2026 it sits on the
          desktop as a video file. New videos go to the end of the list.
        </p>
        <VideoFields id="new-video" form={form} onChange={setForm} />
        <Button onClick={handleAdd} disabled={saving || !form.title.trim()}>
          {saving ? 'Adding…' : 'Add Video'}
        </Button>
      </div>

      <div>
        <h2 className="mb-4 font-headline text-2xl font-bold">Videos</h2>
        {isLoading && (
          <div className="space-y-2">
            {Array.from({ length: 3 }, (_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        )}
        {!isLoading && videos?.length === 0 && <p className="text-sm text-muted-foreground">No videos yet. Add one above.</p>}
        {!isLoading && !!videos?.length && (
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Video</TableHead>
                  <TableHead>Desktop</TableHead>
                  <TableHead>2006 torrent</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {videos.map((video) => {
                  const in2006 = hasEra(video, '2006');
                  const facts = torrentFacts(video);
                  return (
                    <TableRow key={video.id}>
                      <TableCell className="font-medium">{video.order}</TableCell>
                      <TableCell>
                        <p className="font-medium">{video.title}</p>
                        <p className="max-w-[28ch] truncate text-xs text-muted-foreground">{video.url || 'no link'}</p>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {video.eras?.map((era) => (
                            <Badge key={era} variant="secondary">
                              {era}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {in2006 ? (
                          <>
                            {facts.status === 'downloading'
                              ? `Downloading ${facts.progress.toFixed(1)}%, ${formatEta(etaSeconds(facts.sizeMB, facts.progress, facts.downloadKBps))} left`
                              : 'Seeding'}
                            <span className="block text-xs text-muted-foreground">
                              {formatSize(facts.sizeMB)} · {facts.seeds} seeds · {facts.peers} peers
                            </span>
                          </>
                        ) : (
                          '–'
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {video.url && (
                            <Button variant="outline" size="icon" className="h-8 w-8" asChild>
                              <a href={video.url} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="h-4 w-4" />
                                <span className="sr-only">Open {video.title}</span>
                              </a>
                            </Button>
                          )}
                          <Button variant="secondary" size="icon" className="h-8 w-8" onClick={() => openEdit(video)}>
                            <Pencil className="h-4 w-4" />
                            <span className="sr-only">Edit {video.title}</span>
                          </Button>
                          <Button variant="destructive" size="icon" className="h-8 w-8" onClick={() => handleDelete(video)}>
                            <XCircle className="h-5 w-5" />
                            <span className="sr-only">Delete {video.title}</span>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Video</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <VideoFields id="edit-video" form={editForm} onChange={setEditForm} />
            <div className="space-y-2">
              <Label htmlFor="edit-video-order">Position in the list</Label>
              <Input
                id="edit-video-order"
                type="number"
                value={editOrder}
                onChange={(e) => setEditOrder(e.target.value)}
                placeholder="e.g. 1"
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button onClick={handleSave}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
