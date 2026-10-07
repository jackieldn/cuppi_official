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
import { useToast } from '@/hooks/use-toast';
import { Progress } from '@/components/ui/progress';
import { XCircle, Pencil } from 'lucide-react';
import { Skeleton } from '../ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Label } from '../ui/label';
import { cn, getResizedImageUrl } from '@/lib/utils';

type HobbyImage = {
  id: string;
  imageUrl: string;
  createdAt: any;
  tags?: string[];
  order?: number;
  width: number;
  height: number;
};

// Class names for different widths, all with the same aspect ratio / height
const layoutPattern = [
    "sm:col-span-2",
    "sm:col-span-1",
    "sm:col-span-3",
    "sm:col-span-1",
    "sm:col-span-2",
];

export function FreeTimeAdmin() {
  const firestore = useFirestore();
  const storage = useStorage();
  const { toast } = useToast();
  const [files, setFiles] = useState<FileList | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [editingImage, setEditingImage] = useState<HobbyImage | null>(null);
  const [tags, setTags] = useState('');
  const [order, setOrder] = useState<number | ''>('');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const imagesQuery = useMemo(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'hobby_images'), orderBy('createdAt', 'desc'));
  }, [firestore]);

  const { data: images, isLoading } = useCollection<HobbyImage>(imagesQuery);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFiles(e.target.files);
  };
  
  const getImageDimensions = (file: File): Promise<{ width: number, height: number }> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new window.Image();
            img.onload = () => {
                resolve({ width: img.width, height: img.height });
            };
            img.onerror = reject;
            img.src = e.target?.result as string;
        };
        reader.readAsDataURL(file);
    });
  };

  const handleUpload = async () => {
    if (!files || files.length === 0 || !storage || !firestore) {
      toast({
        variant: 'destructive',
        title: 'No files selected',
        description: 'Please select one or more images to upload.',
      });
      return;
    }

    setUploadProgress(0);
    const uploadPromises = Array.from(files).map(async (file) => {
      const storageRef = ref(storage, `hobby_images/${Date.now()}_${file.name}`);
      const uploadTask = uploadBytesResumable(storageRef, file);
      const {width, height} = await getImageDimensions(file);

      return new Promise<void>((resolve, reject) => {
        uploadTask.on(
          'state_changed',
          (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            setUploadProgress(progress);
          },
          (error) => {
            console.error('Upload failed for a file:', error);
            reject(error);
          },
          async () => {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            await addDoc(collection(firestore, 'hobby_images'), {
              imageUrl: downloadURL,
              createdAt: serverTimestamp(),
              tags: [],
              order: 0,
              width,
              height,
            });
            resolve();
          }
        );
      });
    });

    try {
      await Promise.all(uploadPromises);
      toast({
        title: 'Upload successful!',
        description: `${files.length} image(s) have been added to the gallery.`,
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Upload failed',
        description: 'One or more images could not be uploaded.',
      });
    } finally {
      setFiles(null);
      const fileInput = document.getElementById('hobby-image-upload') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
      setUploadProgress(null);
    }
  };

  const handleDelete = async (image: HobbyImage) => {
    if (!firestore || !storage) return;

    if (window.confirm('Are you sure you want to delete this image?')) {
      try {
        await deleteDoc(doc(firestore, 'hobby_images', image.id));
        const imageRef = ref(storage, image.imageUrl);
        await deleteObject(imageRef);
        toast({ title: 'Image deleted.' });
      } catch (error) {
        console.error("Deletion error:", error);
        toast({
          variant: 'destructive',
          title: 'Deletion failed',
          description: 'Could not delete the image. It might have already been removed.',
        });
      }
    }
  };
  
  const handleEditClick = (image: HobbyImage) => {
    setEditingImage(image);
    setTags(image.tags?.join(', ') || '');
    setOrder(image.order ?? '');
    setIsEditModalOpen(true);
  };

  const handleSaveChanges = async () => {
    if (!editingImage || !firestore) return;

    const imageRef = doc(firestore, 'hobby_images', editingImage.id);
    try {
      const updateData: any = {
        tags: tags.split(',').map(t => t.trim()).filter(Boolean),
        order: order === '' ? null : Number(order),
      };
      await updateDoc(imageRef, updateData);
      toast({ title: 'Image updated!' });
      setIsEditModalOpen(false);
      setEditingImage(null);
    } catch (error) {
        console.error("Update error:", error);
        toast({
            variant: "destructive",
            title: "Update failed",
            description: "Could not save changes to the image."
        })
    }
  };

  return (
    <div className="space-y-8">
      <div className="border p-8 rounded-lg space-y-4">
        <h2 className="font-headline text-2xl font-bold">Upload New Images</h2>
        <Input
          id="hobby-image-upload"
          type="file"
          multiple
          accept="image/*"
          onChange={handleFileChange}
        />
        <Button onClick={handleUpload} disabled={!files || uploadProgress !== null}>
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
        <h2 className="font-headline text-2xl font-bold mb-4">Existing Images</h2>
        {isLoading && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, index) => <Skeleton key={index} className="aspect-[4/3] rounded-lg" />)}
          </div>
        )}
        <div 
            className="grid grid-cols-1 sm:grid-cols-6 gap-4 [grid-auto-rows:200px]"
        >
          {images?.map((image, index) => (
            <div key={image.id} className={cn(
                "relative group",
                layoutPattern[index % layoutPattern.length]
            )}>
              <div className="absolute inset-0 overflow-hidden rounded-lg">
                <Image
                    src={getResizedImageUrl(image.imageUrl, '400x400')}
                    alt="Uploaded hobby image"
                    fill
                    sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                    className="object-cover"
                />
              </div>
              <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  variant="secondary"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => handleEditClick(image)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="destructive"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => handleDelete(image)}
                >
                  <XCircle className="h-5 w-5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Edit Image Details</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
                <div className="space-y-2">
                    <Label htmlFor="tags">Tags (comma-separated)</Label>
                    <Input id="tags" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="e.g. comics, drawing" />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="order">Order Number</Label>
                    <Input id="order" type="number" value={order} onChange={(e) => setOrder(e.target.value === '' ? '' : Number(e.target.value))} placeholder="e.g. 1" />
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
