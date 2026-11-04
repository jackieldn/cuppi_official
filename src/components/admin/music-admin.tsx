'use client';

import { useState, useMemo } from 'react';
import Image from 'next/image';
import { useCollection, useFirestore, useStorage } from '@/firebase';
import {
  collection,
  query,
  orderBy,
  addDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { XCircle, Pencil } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { MusicCover } from '@/lib/about-types';

/**
 * Manages the album covers shown in the About page's "Music taste" section.
 * Covers show in ascending `order`; new uploads go to the end of the list.
 */
export function MusicAdmin() {
  const firestore = useFirestore();
  const storage = useStorage();
  const { toast } = useToast();
  const [files, setFiles] = useState<FileList | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [editing, setEditing] = useState<MusicCover | null>(null);
  const [title, setTitle] = useState('');
  const [order, setOrder] = useState<number | ''>('');
  const [isEditOpen, setIsEditOpen] = useState(false);

  const coversQuery = useMemo(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'music_covers'), orderBy('order'));
  }, [firestore]);

  const { data: covers, isLoading } = useCollection<MusicCover>(coversQuery);

  const handleUpload = async () => {
    if (!files || files.length === 0 || !storage || !firestore) {
      toast({
        variant: 'destructive',
        title: 'No files selected',
        description: 'Please select one or more album covers to upload.',
      });
      return;
    }

    const selected = Array.from(files);
    const lastOrder = covers?.reduce((max, c) => Math.max(max, c.order ?? 0), 0) ?? 0;
    const progressByFile = selected.map(() => 0);
    setUploadProgress(0);

    const uploads = selected.map((file, index) => {
      const storageRef = ref(storage, `music_covers/${Date.now()}_${index}_${file.name}`);
      const task = uploadBytesResumable(storageRef, file);

      return new Promise<void>((resolve, reject) => {
        task.on(
          'state_changed',
          (snapshot) => {
            progressByFile[index] = snapshot.bytesTransferred / snapshot.totalBytes;
            const average = progressByFile.reduce((a, b) => a + b, 0) / progressByFile.length;
            setUploadProgress(average * 100);
          },
          (error) => {
            console.error('Upload failed for a file:', error);
            reject(error);
          },
          async () => {
            try {
              const downloadURL = await getDownloadURL(task.snapshot.ref);
              await addDoc(collection(firestore, 'music_covers'), {
                imageUrl: downloadURL,
                title: '',
                order: lastOrder + 1 + index,
                createdAt: serverTimestamp(),
              });
              resolve();
            } catch (error) {
              reject(error);
            }
          }
        );
      });
    });

    try {
      await Promise.all(uploads);
      toast({
        title: 'Upload successful!',
        description: `${selected.length} cover(s) added to Music taste.`,
      });
    } catch {
      toast({
        variant: 'destructive',
        title: 'Upload failed',
        description: 'One or more covers could not be uploaded.',
      });
    } finally {
      setFiles(null);
      const input = document.getElementById('music-cover-upload') as HTMLInputElement | null;
      if (input) input.value = '';
      setUploadProgress(null);
    }
  };

  const handleDelete = async (cover: MusicCover) => {
    if (!firestore || !storage) return;
    if (!window.confirm('Are you sure you want to delete this cover?')) return;
    try {
      await deleteDoc(doc(firestore, 'music_covers', cover.id));
      await deleteObject(ref(storage, cover.imageUrl));
      toast({ title: 'Cover deleted.' });
    } catch (error) {
      console.error('Deletion error:', error);
      toast({
        variant: 'destructive',
        title: 'Deletion failed',
        description: 'Could not delete the cover. It might have already been removed.',
      });
    }
  };

  const handleEditClick = (cover: MusicCover) => {
    setEditing(cover);
    setTitle(cover.title ?? '');
    setOrder(cover.order ?? '');
    setIsEditOpen(true);
  };

  const handleSaveChanges = async () => {
    if (!editing || !firestore) return;
    try {
      await updateDoc(doc(firestore, 'music_covers', editing.id), {
        title: title.trim(),
        // A cover with no order would not appear in the ordered query, so default to the end.
        order: order === '' ? (covers?.length ?? 0) + 1 : Number(order),
      });
      toast({ title: 'Cover updated!' });
      setIsEditOpen(false);
      setEditing(null);
    } catch (error) {
      console.error('Update error:', error);
      toast({
        variant: 'destructive',
        title: 'Update failed',
        description: 'Could not save changes to the cover.',
      });
    }
  };

  return (
    <div className="space-y-8">
      <div className="border p-8 rounded-lg space-y-4">
        <h2 className="font-headline text-2xl font-bold">Upload New Covers</h2>
        <p className="text-sm text-muted-foreground">
          Square (1:1) images work best; anything else is cropped to a square on the site.
          New covers are added to the end.
        </p>
        <Input
          id="music-cover-upload"
          type="file"
          multiple
          accept="image/*"
          onChange={(e) => setFiles(e.target.files)}
        />
        <Button onClick={handleUpload} disabled={!files || files.length === 0 || uploadProgress !== null}>
          Upload
        </Button>
        {uploadProgress !== null && (
          <div className="space-y-2">
            <Progress value={uploadProgress} />
            <p className="text-sm text-muted-foreground">Uploading...</p>
          </div>
        )}
      </div>

      <div>
        <h2 className="font-headline text-2xl font-bold mb-4">Existing Covers</h2>
        {isLoading && (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <Skeleton key={index} className="aspect-square rounded-lg" />
            ))}
          </div>
        )}
        {!isLoading && covers?.length === 0 && (
          <p className="text-sm text-muted-foreground">No covers yet. Upload some above.</p>
        )}
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4">
          {covers?.map((cover) => (
            <div key={cover.id} className="relative group aspect-square overflow-hidden rounded-lg">
              <Image
                src={cover.imageUrl}
                alt={cover.title || 'Album cover'}
                fill
                sizes="(max-width: 768px) 33vw, 12vw"
                className="object-cover"
              />
              <span className="absolute bottom-1 left-1 rounded bg-background/80 px-1.5 text-xs font-medium">
                {cover.order ?? '–'}
              </span>
              <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  variant="secondary"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => handleEditClick(cover)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="destructive"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => handleDelete(cover)}
                >
                  <XCircle className="h-5 w-5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Cover</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="cover-title">Album / artist (optional)</Label>
              <Input
                id="cover-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Radiohead – OK Computer"
              />
              <p className="text-xs text-muted-foreground">Used as the cover's description for screen readers.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="cover-order">Order Number</Label>
              <Input
                id="cover-order"
                type="number"
                value={order}
                onChange={(e) => setOrder(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="e.g. 1"
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button onClick={handleSaveChanges}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
