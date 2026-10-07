'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useFieldArray } from 'react-hook-form';
import { z } from 'zod';
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
import { useFirestore, useStorage, addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { App, GalleryImage } from '@/lib/about-types';
import { useEffect, useState } from 'react';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from "firebase/storage";
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Image from 'next/image';
import { XCircle, Trash } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { format } from 'date-fns';

const platformOptions = ["Web", "iOS", "Android", "MacOS", "Windows"] as const;
const availabilityOptions = ["Available", "In Development", "Beta", "Retired"] as const;

const updateSchema = z.object({
    id: z.string().optional(),
    date: z.string().min(1, "Date is required"),
    version: z.string().optional(),
    description: z.string().min(1, "Description is required"),
});

const formSchema = z.object({
  title: z.string().min(2, 'Title must be at least 2 characters.'),
  slug: z.string().min(2, 'Slug must be at least 2 characters.'),
  description: z.string().min(10, 'Description is required.'),
  tags: z.string().optional(),
  platforms: z.array(z.string()).min(1, "Select at least one platform."),
  availability: z.enum(availabilityOptions),
  releaseDate: z.string().min(1, "Release date is required."),
  link: z.string().url("Must be a valid URL."),
  // these are now for initial load only, state will handle new files
  coverImage: z.any().optional(),
  galleryImages: z.any().optional(),
  updateHistory: z.array(updateSchema).optional(),
});

type AppFormValues = z.infer<typeof formSchema>;

interface AppFormProps {
  app?: App | null;
  onFinished: () => void;
}

const getImageDimensions = (file: File): Promise<{ width: number; height: number }> => {
  return new Promise((resolve, reject) => {
    if (!file || typeof file.type === 'undefined' || !file.type.startsWith('image/')) {
        return reject(new Error("Invalid file provided to getImageDimensions"));
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new window.Image();
      img.onload = () => resolve({ width: img.width, height: img.height });
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};


export function AppForm({ app, onFinished }: AppFormProps) {
  const firestore = useFirestore();
  const storage = useStorage();
  const { toast } = useToast();
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  
  // State for new file selections
  const [newCoverImage, setNewCoverImage] = useState<FileList | null>(null);
  const [newGalleryImages, setNewGalleryImages] = useState<FileList | null>(null);

  // State for existing image previews
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [galleryPreviews, setGalleryPreviews] = useState<GalleryImage[]>([]);
  
  // State for tracking deletions
  const [imagesToDelete, setImagesToDelete] = useState<string[]>([]);
  

  const form = useForm<AppFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      slug: '',
      description: '',
      tags: '',
      platforms: [],
      availability: 'In Development',
      releaseDate: '',
      link: '',
      updateHistory: [],
    },
  });
  
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "updateHistory",
  });

  useEffect(() => {
    if (app) {
      form.reset({
        ...app,
        tags: app.tags?.join(', '),
        releaseDate: format(new Date(app.releaseDate), 'yyyy-MM-dd'),
        updateHistory: app.updateHistory?.map(u => ({...u, date: format(new Date(u.date), 'yyyy-MM-dd')})) || []
      });
      setGalleryPreviews(app.galleryImages || []);
      setCoverPreview(app.coverImage?.url || null);
    } else {
      form.reset({
        title: '', slug: '', description: '', tags: '', platforms: [],
        availability: 'In Development', releaseDate: '', link: '', updateHistory: [],
      });
      setGalleryPreviews([]);
      setCoverPreview(null);
    }
    // Clear all file-related state on app change
    setNewCoverImage(null);
    setNewGalleryImages(null);
    setImagesToDelete([]);

  }, [app, form]);
  
  const handleFileUpload = async (file: File, path: string): Promise<GalleryImage> => {
    return new Promise(async (resolve, reject) => {
      if (!storage || !file) return reject("Storage not available or no file provided");
      
      try {
        const { width, height } = await getImageDimensions(file);
        const storageRef = ref(storage, path);
        const uploadTask = uploadBytesResumable(storageRef, file);

        uploadTask.on('state_changed',
          (snapshot) => setUploadProgress((snapshot.bytesTransferred / snapshot.totalBytes) * 100),
          (error) => reject(error),
          async () => {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            resolve({ url: downloadURL, width, height });
          }
        );
      } catch (error) {
        reject(error);
      }
    });
  };

  const handleDeleteGalleryImage = (imageUrl: string) => {
    setGalleryPreviews(prev => prev.filter(img => img.url !== imageUrl));
    setImagesToDelete(prev => [...prev, imageUrl]);
  };

  const deleteFilesFromStorage = async (urls: string[]) => {
    if (!storage || urls.length === 0) return;
    const deletePromises = urls.map(url => {
        try {
            if (url && url.includes('firebasestorage.googleapis.com')) {
                return deleteObject(ref(storage, url));
            }
            return Promise.resolve();
        } catch (error) {
            console.error(`Failed to create ref for URL: ${url}`, error);
            return Promise.resolve();
        }
    });
    await Promise.all(deletePromises).catch(err => {
        toast({ variant: "destructive", title: "Could not delete some old file(s)" });
        console.error("Error during file deletion from storage:", err);
    });
  };

  const onSubmit = async (data: AppFormValues) => {
    if (!firestore) return;
    setUploadProgress(0);

    try {
      // 1. Delete files marked for deletion
      await deleteFilesFromStorage(imagesToDelete);

      // 2. Handle cover image upload
      let finalCoverImage: GalleryImage | undefined = app?.coverImage;
      if (newCoverImage?.[0]) {
        // If there was an old image, delete it from storage
        if (app?.coverImage?.url) {
            await deleteFilesFromStorage([app.coverImage.url]);
        }
        finalCoverImage = await handleFileUpload(newCoverImage[0], `apps/cover/${Date.now()}_${newCoverImage[0].name}`);
      } else if (!app) {
        // Only error if it's a new app and no cover image is provided
        toast({ variant: "destructive", title: "Error", description: "Cover image is required for a new app." });
        setUploadProgress(null);
        return;
      }

      // 3. Handle gallery image uploads
      let uploadedGalleryImages: GalleryImage[] = [];
      if (newGalleryImages && newGalleryImages.length > 0) {
        const uploadPromises: Promise<GalleryImage>[] = [];
        for (const file of Array.from(newGalleryImages)) {
          uploadPromises.push(handleFileUpload(file, `apps/gallery/${Date.now()}_${file.name}`));
        }
        uploadedGalleryImages = await Promise.all(uploadPromises);
      }
      
      const finalGalleryImages = [...galleryPreviews, ...uploadedGalleryImages];

      // 4. Prepare final data object
      const finalData = {
        ...data,
        tags: data.tags?.split(',').map(tag => tag.trim()).filter(Boolean) || [],
        coverImage: finalCoverImage,
        galleryImages: finalGalleryImages,
        updateHistory: (data.updateHistory || []).map(u => ({...u, id: u.id || doc(collection(firestore, '_')).id }))
      };

      // Clean up form data before submitting
      delete (finalData as any).image;
      delete (finalData as any).galleryImages;

      // 5. Save to Firestore
      if (app) {
        updateDocumentNonBlocking(doc(firestore, 'apps', app.id), finalData);
        toast({ title: 'App updated successfully!' });
      } else {
        addDocumentNonBlocking(collection(firestore, 'apps'), finalData);
        toast({ title: 'App added successfully!' });
      }
      onFinished();
    } catch (error: any) {
      console.error('Error in onSubmit:', error);
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } finally {
      setUploadProgress(null);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 border p-8 rounded-lg">
        {/* Basic Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <FormField name="title" control={form.control} render={({ field }) => (
                <FormItem><FormLabel>Title</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField name="slug" control={form.control} render={({ field }) => (
                <FormItem><FormLabel>Slug</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )} />
        </div>
        <FormField name="description" control={form.control} render={({ field }) => (
            <FormItem><FormLabel>Description</FormLabel><FormControl><Textarea {...field} rows={4} /></FormControl><FormMessage /></FormItem>
        )} />
        <FormField name="link" control={form.control} render={({ field }) => (
            <FormItem><FormLabel>Link</FormLabel><FormControl><Input type="url" {...field} /></FormControl><FormMessage /></FormItem>
        )} />
         <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <FormField name="releaseDate" control={form.control} render={({ field }) => (
                <FormItem><FormLabel>Release Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField name="availability" control={form.control} render={({ field }) => (
              <FormItem><FormLabel>Availability</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                  <SelectContent>{availabilityOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                </Select><FormMessage />
              </FormItem>
            )} />
        </div>
        
        {/* Platforms and Tags */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <FormField name="platforms" control={form.control} render={({ field }) => (
                <FormItem>
                    <FormLabel>Platforms</FormLabel>
                    <div className="grid grid-cols-2 gap-2">
                        {platformOptions.map(p => (
                            <FormField key={p} control={form.control} name="platforms" render={({ field }) => (
                                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                    <FormControl>
                                        <Checkbox
                                            checked={field.value?.includes(p)}
                                            onCheckedChange={checked => {
                                                return checked
                                                    ? field.onChange([...(field.value || []), p])
                                                    : field.onChange(field.value?.filter(v => v !== p))
                                            }}
                                        />
                                    </FormControl>
                                    <FormLabel className="font-normal">{p}</FormLabel>
                                </FormItem>
                            )} />
                        ))}
                    </div>
                    <FormMessage/>
                </FormItem>
            )} />
             <FormField name="tags" control={form.control} render={({ field }) => (
                <FormItem><FormLabel>Tags (comma-separated)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )} />
        </div>

        {/* File Uploads */}
         <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <FormItem><FormLabel>Cover Image</FormLabel><FormControl><Input type="file" accept="image/*" onChange={e => setNewCoverImage(e.target.files)} /></FormControl>
                {coverPreview && <Image src={coverPreview} alt="Cover preview" width={100} height={100} className="rounded-md mt-2 object-cover" />}
                <FormMessage />
              </FormItem>
            <div className="space-y-4">
                <FormItem><FormLabel>Gallery Images</FormLabel><FormControl><Input type="file" multiple accept="image/*" onChange={e => setNewGalleryImages(e.target.files)} /></FormControl><FormMessage /></FormItem>
                {galleryPreviews.length > 0 && (
                    <div className="grid grid-cols-4 gap-2">
                        {galleryPreviews.map(img => (
                            <div key={img.url} className="relative group">
                                <Image src={img.url} alt="Preview" width={100} height={100} className="rounded-md object-cover w-full aspect-square" />
                                <Button type="button" variant="destructive" size="icon" className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100" onClick={() => handleDeleteGalleryImage(img.url)}><XCircle className="h-4 w-4" /></Button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
        
        {/* Update History */}
        <div className="space-y-4 rounded-lg border p-4">
            <h3 className="font-medium">Update History</h3>
            {fields.map((field, index) => (
                <div key={field.id} className="grid grid-cols-[1fr_1fr_2fr_auto] gap-4 items-end border-b pb-4">
                    <FormField control={form.control} name={`updateHistory.${index}.date`} render={({ field }) => (
                         <FormItem><FormLabel>Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name={`updateHistory.${index}.version`} render={({ field }) => (
                         <FormItem><FormLabel>Version</FormLabel><FormControl><Input {...field} placeholder="e.g. 1.2.3" /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name={`updateHistory.${index}.description`} render={({ field }) => (
                         <FormItem><FormLabel>Description</FormLabel><FormControl><Textarea {...field} rows={1} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}><Trash className="h-4 w-4 text-destructive" /></Button>
                </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={() => append({ date: format(new Date(), 'yyyy-MM-dd'), version: '', description: '' })}>Add Update</Button>
        </div>

        {uploadProgress !== null && <Progress value={uploadProgress} />}

        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={onFinished}>Cancel</Button>
          <Button type="submit" disabled={form.formState.isSubmitting || uploadProgress !== null}>Save</Button>
        </div>
      </form>
    </Form>
  );
}
