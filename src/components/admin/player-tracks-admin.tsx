'use client';

// Manages the playlist of the desktop easter egg's music player: short audio
// samples with title, artist, genre, year and optional cover art.

import { useMemo, useState } from 'react';
import Image from 'next/image';
import { addDoc, collection, deleteDoc, doc, orderBy, query, serverTimestamp, updateDoc } from 'firebase/firestore';
import { deleteObject, getDownloadURL, ref, uploadBytesResumable, type FirebaseStorage } from 'firebase/storage';
import { Music, Pencil, XCircle } from 'lucide-react';

import { useCollection, useFirestore, useStorage } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { PLAYER_TRACKS, formatTime, type PlayerTrack } from '@/lib/music-player-types';

type Fields = { title: string; artist: string; album: string; genre: string; year: string };
const EMPTY: Fields = { title: '', artist: '', album: '', genre: '', year: '' };

// Samples are meant to be about 10 seconds; anything much longer gets a warning.
const LONG_SAMPLE_SEC = 15;

/** Reads an audio file's length in the browser, before it's uploaded. */
function readDuration(file: File): Promise<number | undefined> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const audio = new Audio();
    const done = (value?: number) => {
      URL.revokeObjectURL(url);
      resolve(value);
    };
    audio.preload = 'metadata';
    audio.onloadedmetadata = () => done(Number.isFinite(audio.duration) ? audio.duration : undefined);
    audio.onerror = () => done(undefined);
    audio.src = url;
  });
}

function upload(storage: FirebaseStorage, path: string, file: File, onProgress: (fraction: number) => void) {
  const task = uploadBytesResumable(ref(storage, path), file, { contentType: file.type });
  return new Promise<string>((resolve, reject) => {
    task.on(
      'state_changed',
      (s) => onProgress(s.bytesTransferred / s.totalBytes),
      reject,
      async () => resolve(await getDownloadURL(task.snapshot.ref)),
    );
  });
}

/** Firestore rejects `undefined`, so optional fields are left out instead. */
function textFields(f: Fields) {
  const year = Number.parseInt(f.year, 10);
  return {
    title: f.title.trim(),
    artist: f.artist.trim(),
    ...(f.album.trim() && { album: f.album.trim() }),
    ...(f.genre.trim() && { genre: f.genre.trim() }),
    ...(Number.isFinite(year) && { year }),
  };
}

function TrackFields({ id, fields, onChange }: { id: string; fields: Fields; onChange: (f: Fields) => void }) {
  const field = (key: keyof Fields, label: string, placeholder: string, extra?: React.ComponentProps<typeof Input>) => (
    <div className="space-y-2">
      <Label htmlFor={`${id}-${key}`}>{label}</Label>
      <Input
        id={`${id}-${key}`}
        value={fields[key]}
        onChange={(e) => onChange({ ...fields, [key]: e.target.value })}
        placeholder={placeholder}
        {...extra}
      />
    </div>
  );
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {field('title', 'Name *', 'e.g. Teardrop')}
      {field('artist', 'Singer / artist *', 'e.g. Massive Attack')}
      {field('album', 'Album', 'e.g. Mezzanine')}
      {field('genre', 'Genre', 'e.g. Trip hop')}
      {field('year', 'Year', 'e.g. 1998', { type: 'number', min: 1900, max: 2100 })}
    </div>
  );
}

export function PlayerTracksAdmin() {
  const firestore = useFirestore();
  const storage = useStorage();
  const { toast } = useToast();

  const [fields, setFields] = useState<Fields>(EMPTY);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [duration, setDuration] = useState<number | undefined>();
  const [progress, setProgress] = useState<number | null>(null);
  const [fileInputsKey, setFileInputsKey] = useState(0);

  const [editing, setEditing] = useState<PlayerTrack | null>(null);
  const [editFields, setEditFields] = useState<Fields>(EMPTY);
  const [editOrder, setEditOrder] = useState('');

  const tracksQuery = useMemo(
    () => (firestore ? query(collection(firestore, PLAYER_TRACKS), orderBy('order')) : null),
    [firestore],
  );
  const { data: tracks, isLoading } = useCollection<PlayerTrack>(tracksQuery);

  const canAdd = fields.title.trim() && fields.artist.trim() && audioFile && progress === null;

  const onAudioChange = async (file: File | null) => {
    setAudioFile(file);
    setDuration(file ? await readDuration(file) : undefined);
  };

  const handleAdd = async () => {
    if (!firestore || !storage || !audioFile || !canAdd) return;
    const stamp = Date.now();
    const audioPath = `${PLAYER_TRACKS}/${stamp}_${audioFile.name}`;
    const coverPath = coverFile ? `${PLAYER_TRACKS}/${stamp}_cover_${coverFile.name}` : undefined;
    // Progress across both files, weighted by size.
    const total = audioFile.size + (coverFile?.size ?? 0);
    let audioDone = 0;
    let coverDone = 0;
    const report = () => setProgress(((audioDone * audioFile.size + coverDone * (coverFile?.size ?? 0)) / total) * 100);
    setProgress(0);

    try {
      const [audioUrl, coverUrl] = await Promise.all([
        upload(storage, audioPath, audioFile, (f) => ((audioDone = f), report())),
        coverFile && coverPath
          ? upload(storage, coverPath, coverFile, (f) => ((coverDone = f), report()))
          : Promise.resolve(undefined),
      ]);
      const lastOrder = tracks?.reduce((max, t) => Math.max(max, t.order ?? 0), 0) ?? 0;
      await addDoc(collection(firestore, PLAYER_TRACKS), {
        ...textFields(fields),
        audioUrl,
        audioPath,
        ...(coverUrl && coverPath && { coverUrl, coverPath }),
        ...(duration !== undefined && { durationSec: Math.round(duration * 10) / 10 }),
        order: lastOrder + 1,
        createdAt: serverTimestamp(),
      });
      toast({ title: 'Track added', description: `${fields.title.trim()} is on the playlist.` });
      setFields(EMPTY);
      setAudioFile(null);
      setCoverFile(null);
      setDuration(undefined);
      setFileInputsKey((k) => k + 1);
    } catch (error) {
      console.error('Track upload failed:', error);
      // Don't leave orphaned files behind.
      await Promise.allSettled(
        [audioPath, coverPath].filter(Boolean).map((p) => deleteObject(ref(storage, p as string))),
      );
      toast({ variant: 'destructive', title: 'Upload failed', description: 'The track could not be added.' });
    } finally {
      setProgress(null);
    }
  };

  const handleDelete = async (track: PlayerTrack) => {
    if (!firestore || !storage) return;
    if (!window.confirm(`Delete "${track.title}" from the playlist?`)) return;
    try {
      await deleteDoc(doc(firestore, PLAYER_TRACKS, track.id));
      await Promise.allSettled(
        [track.audioPath, track.coverPath].filter(Boolean).map((p) => deleteObject(ref(storage, p as string))),
      );
      toast({ title: 'Track deleted.' });
    } catch (error) {
      console.error('Track delete failed:', error);
      toast({ variant: 'destructive', title: 'Deletion failed', description: 'Could not delete the track.' });
    }
  };

  const openEdit = (track: PlayerTrack) => {
    setEditing(track);
    setEditFields({
      title: track.title ?? '',
      artist: track.artist ?? '',
      album: track.album ?? '',
      genre: track.genre ?? '',
      year: track.year?.toString() ?? '',
    });
    setEditOrder(track.order?.toString() ?? '');
  };

  const handleSave = async () => {
    if (!editing || !firestore) return;
    if (!editFields.title.trim() || !editFields.artist.trim()) {
      toast({ variant: 'destructive', title: 'Name and artist are required.' });
      return;
    }
    const order = Number.parseInt(editOrder, 10);
    const text = textFields(editFields);
    try {
      await updateDoc(doc(firestore, PLAYER_TRACKS, editing.id), {
        title: text.title,
        artist: text.artist,
        // Cleared fields are written as empty, not left as they were.
        album: text.album ?? '',
        genre: text.genre ?? '',
        year: text.year ?? null,
        order: Number.isFinite(order) ? order : (tracks?.length ?? 0) + 1,
      });
      toast({ title: 'Track updated!' });
      setEditing(null);
    } catch (error) {
      console.error('Track update failed:', error);
      toast({ variant: 'destructive', title: 'Update failed', description: 'Could not save changes to the track.' });
    }
  };

  return (
    <div className="space-y-8">
      <div className="space-y-4 rounded-lg border p-8">
        <h2 className="font-headline text-2xl font-bold">Add a Track</h2>
        <p className="text-sm text-muted-foreground">
          Upload a short sample (about 10 seconds) for the desktop&apos;s music player. Square cover art works best.
          New tracks go to the end of the playlist.
        </p>

        <TrackFields id="new-track" fields={fields} onChange={setFields} />

        <div className="grid gap-4 sm:grid-cols-2" key={fileInputsKey}>
          <div className="space-y-2">
            <Label htmlFor="new-track-audio">Audio sample *</Label>
            <Input
              id="new-track-audio"
              type="file"
              accept="audio/*"
              onChange={(e) => onAudioChange(e.target.files?.[0] ?? null)}
            />
            {duration !== undefined && (
              <p className={duration > LONG_SAMPLE_SEC ? 'text-xs text-accent' : 'text-xs text-muted-foreground'}>
                Length {formatTime(duration)}
                {duration > LONG_SAMPLE_SEC && ' – longer than a 10-second sample, are you sure?'}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-track-cover">Cover art</Label>
            <Input
              id="new-track-cover"
              type="file"
              accept="image/*"
              onChange={(e) => setCoverFile(e.target.files?.[0] ?? null)}
            />
          </div>
        </div>

        <Button onClick={handleAdd} disabled={!canAdd}>
          Add to Playlist
        </Button>
        {progress !== null && (
          <div className="space-y-2">
            <Progress value={progress} />
            <p className="text-sm text-muted-foreground">Uploading...</p>
          </div>
        )}
      </div>

      <div>
        <h2 className="mb-4 font-headline text-2xl font-bold">Playlist</h2>
        {isLoading && (
          <div className="space-y-2">
            {Array.from({ length: 3 }, (_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        )}
        {!isLoading && tracks?.length === 0 && (
          <p className="text-sm text-muted-foreground">No tracks yet. Add one above.</p>
        )}
        {!isLoading && !!tracks?.length && (
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Track</TableHead>
                  <TableHead>Genre</TableHead>
                  <TableHead>Year</TableHead>
                  <TableHead>Length</TableHead>
                  <TableHead>Preview</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tracks.map((track) => (
                  <TableRow key={track.id}>
                    <TableCell className="font-medium">{track.order}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="relative flex size-10 shrink-0 items-center justify-center overflow-hidden rounded bg-secondary">
                          {track.coverUrl ? (
                            <Image src={track.coverUrl} alt="" fill sizes="40px" className="object-cover" />
                          ) : (
                            <Music className="size-4 text-muted-foreground" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-medium">{track.title}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {track.artist}
                            {track.album && ` · ${track.album}`}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{track.genre || '–'}</TableCell>
                    <TableCell>{track.year ?? '–'}</TableCell>
                    <TableCell>{track.durationSec !== undefined ? formatTime(track.durationSec) : '–'}</TableCell>
                    <TableCell>
                      <audio controls preload="none" src={track.audioUrl} className="h-8 w-48" />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="secondary" size="icon" className="h-8 w-8" onClick={() => openEdit(track)}>
                          <Pencil className="h-4 w-4" />
                          <span className="sr-only">Edit {track.title}</span>
                        </Button>
                        <Button variant="destructive" size="icon" className="h-8 w-8" onClick={() => handleDelete(track)}>
                          <XCircle className="h-5 w-5" />
                          <span className="sr-only">Delete {track.title}</span>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Track</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <TrackFields id="edit-track" fields={editFields} onChange={setEditFields} />
            <div className="space-y-2">
              <Label htmlFor="edit-track-order">Playlist position</Label>
              <Input
                id="edit-track-order"
                type="number"
                value={editOrder}
                onChange={(e) => setEditOrder(e.target.value)}
                placeholder="e.g. 1"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              To change the audio or cover art, delete the track and add it again.
            </p>
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
