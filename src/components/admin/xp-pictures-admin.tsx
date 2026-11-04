'use client';

// Manages the pictures in Poot XP's My Pictures folder (the Time Machine's
// 2006). They only show up there, nowhere else on the site.

import { useMemo, useState } from 'react';
import Image from 'next/image';
import { addDoc, collection, deleteDoc, doc, orderBy, query, serverTimestamp, updateDoc } from 'firebase/firestore';
import { deleteObject, getDownloadURL, ref, uploadBytesResumable, type FirebaseStorage } from 'firebase/storage';
import { Pencil, XCircle } from 'lucide-react';

import { useCollection, useFirestore, useStorage } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { XP_PICTURES, type XpPicture } from '@/lib/poot-xp-types';

const MAX_BYTES = 10 * 1024 * 1024;

/** "holiday_2006.jpg" -> "holiday_2006" */
const baseName = (file: File) => file.name.replace(/\.[^.]+$/, '');

/** Reads an image's size in the browser, before it's uploaded. */
function readSize(file: File): Promise<{ width: number; height: number } | undefined> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new window.Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(undefined);
    };
    img.src = url;
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

export function XpPicturesAdmin() {
  const firestore = useFirestore();
  const storage = useStorage();
  const { toast } = useToast();

  const [files, setFiles] = useState<File[]>([]);
  const [progress, setProgress] = useState<number | null>(null);
  const [inputKey, setInputKey] = useState(0);
  const [editing, setEditing] = useState<XpPicture | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editOrder, setEditOrder] = useState('');

  const picturesQuery = useMemo(
    () => (firestore ? query(collection(firestore, XP_PICTURES), orderBy('order')) : null),
    [firestore],
  );
  const { data: pictures, isLoading } = useCollection<XpPicture>(picturesQuery);

  const tooBig = files.filter((f) => f.size >= MAX_BYTES);
  const canUpload = files.length > 0 && tooBig.length === 0 && progress === null;

  // Uploads one at a time, each added to the end of the folder.
  const handleUpload = async () => {
    if (!firestore || !storage || !canUpload) return;
    let order = pictures?.reduce((max, p) => Math.max(max, p.order ?? 0), 0) ?? 0;
    const total = files.reduce((sum, f) => sum + f.size, 0);
    let done = 0;
    let added = 0;
    setProgress(0);
    for (const file of files) {
      const imagePath = `${XP_PICTURES}/${Date.now()}_${file.name}`;
      try {
        const size = await readSize(file);
        const imageUrl = await upload(storage, imagePath, file, (f) => setProgress(((done + f * file.size) / total) * 100));
        order += 1;
        await addDoc(collection(firestore, XP_PICTURES), {
          title: baseName(file),
          imageUrl,
          imagePath,
          ...(size && { width: size.width, height: size.height }),
          order,
          createdAt: serverTimestamp(),
        });
        added += 1;
      } catch (error) {
        console.error('Picture upload failed:', error);
        await deleteObject(ref(storage, imagePath)).catch(() => {});
        toast({ variant: 'destructive', title: 'Upload failed', description: `${file.name} could not be added.` });
      }
      done += file.size;
    }
    setProgress(null);
    setFiles([]);
    setInputKey((k) => k + 1);
    if (added) toast({ title: added === 1 ? 'Picture added' : `${added} pictures added` });
  };

  const handleDelete = async (picture: XpPicture) => {
    if (!firestore || !storage) return;
    if (!window.confirm(`Delete "${picture.title}"?`)) return;
    try {
      await deleteDoc(doc(firestore, XP_PICTURES, picture.id));
      await deleteObject(ref(storage, picture.imagePath)).catch(() => {});
      toast({ title: 'Picture deleted.' });
    } catch (error) {
      console.error('Picture delete failed:', error);
      toast({ variant: 'destructive', title: 'Deletion failed', description: 'Could not delete the picture.' });
    }
  };

  const openEdit = (picture: XpPicture) => {
    setEditing(picture);
    setEditTitle(picture.title ?? '');
    setEditOrder(picture.order?.toString() ?? '');
  };

  const handleSave = async () => {
    if (!editing || !firestore) return;
    if (!editTitle.trim()) {
      toast({ variant: 'destructive', title: 'A name is required.' });
      return;
    }
    const order = Number.parseInt(editOrder, 10);
    try {
      await updateDoc(doc(firestore, XP_PICTURES, editing.id), {
        title: editTitle.trim(),
        order: Number.isFinite(order) ? order : editing.order,
      });
      toast({ title: 'Picture updated!' });
      setEditing(null);
    } catch (error) {
      console.error('Picture update failed:', error);
      toast({ variant: 'destructive', title: 'Update failed', description: 'Could not save changes.' });
    }
  };

  return (
    <div className="space-y-8">
      <div className="space-y-4 rounded-lg border p-8">
        <h2 className="font-headline text-2xl font-bold">Add Pictures</h2>
        <p className="text-sm text-muted-foreground">
          These show up in My Pictures on the Time Machine&apos;s 2006 desktop, and nowhere else. Each picture is named
          after its file (you can rename it after). Images up to 10 MB.
        </p>
        <div className="space-y-2" key={inputKey}>
          <Label htmlFor="xp-pictures-files">Images</Label>
          <Input
            id="xp-pictures-files"
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
          />
          {tooBig.length > 0 && (
            <p className="text-xs text-destructive">
              Too big (10 MB max): {tooBig.map((f) => f.name).join(', ')}
            </p>
          )}
        </div>
        <Button onClick={handleUpload} disabled={!canUpload}>
          {files.length > 1 ? `Upload ${files.length} Pictures` : 'Upload Picture'}
        </Button>
        {progress !== null && (
          <div className="space-y-2">
            <Progress value={progress} />
            <p className="text-sm text-muted-foreground">Uploading...</p>
          </div>
        )}
      </div>

      <div>
        <h2 className="mb-4 font-headline text-2xl font-bold">My Pictures</h2>
        {isLoading && (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="aspect-[4/3] w-full" />
            ))}
          </div>
        )}
        {!isLoading && pictures?.length === 0 && (
          <p className="text-sm text-muted-foreground">The folder is empty. Add some pictures above.</p>
        )}
        {!isLoading && !!pictures?.length && (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {pictures.map((p) => (
              <div key={p.id} className="overflow-hidden rounded-lg border">
                <div className="relative aspect-[4/3] bg-secondary">
                  <Image src={p.imageUrl} alt={p.title} fill sizes="(min-width: 1024px) 25vw, 50vw" className="object-cover" />
                </div>
                <div className="flex items-center gap-2 p-2">
                  <span className="w-6 shrink-0 text-xs text-muted-foreground">{p.order}</span>
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">{p.title}</span>
                  <Button variant="secondary" size="icon" className="h-8 w-8" onClick={() => openEdit(p)}>
                    <Pencil className="h-4 w-4" />
                    <span className="sr-only">Edit {p.title}</span>
                  </Button>
                  <Button variant="destructive" size="icon" className="h-8 w-8" onClick={() => handleDelete(p)}>
                    <XCircle className="h-5 w-5" />
                    <span className="sr-only">Delete {p.title}</span>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Picture</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-picture-title">Name</Label>
              <Input id="edit-picture-title" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-picture-order">Position in the folder</Label>
              <Input
                id="edit-picture-order"
                type="number"
                value={editOrder}
                onChange={(e) => setEditOrder(e.target.value)}
                placeholder="e.g. 1"
              />
            </div>
            <p className="text-xs text-muted-foreground">To change the image itself, delete it and upload it again.</p>
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
