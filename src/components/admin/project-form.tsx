'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
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
import { Switch } from '@/components/ui/switch';
import { useFirestore, useStorage } from '@/firebase';
import { collection, doc, addDoc, updateDoc, query, orderBy } from 'firebase/firestore';
import { useFetchCollection } from '@/firebase';
import type { Testimonial } from '@/lib/about-types';
import { useToast } from '@/hooks/use-toast';
import { Project } from '@/lib/projects';
import { useEffect, useMemo, useState } from 'react';
import { ref, uploadBytesResumable, getDownloadURL, UploadTaskSnapshot, deleteObject } from "firebase/storage";
import { Progress } from '../ui/progress';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Image from 'next/image';
import { XCircle } from 'lucide-react';

const formSchema = z.object({
  title: z.string().min(2, {
    message: 'Title must be at least 2 characters.',
  }),
  slug: z.string().min(2, {
    message: 'Slug must be at least 2 characters.',
  }),
  description: z.string().min(10, {
    message: 'Description must be at least 10 characters.',
  }),
  image: z.any().optional(),
  blurredImage: z.any().optional(),
  videos: z.any().optional(),
  // File input only. Must not share a name with Project.galleryImages (saved
  // URLs), or form.reset(project) fills it with strings and they get uploaded.
  newGalleryImages: z.any().optional(),
  featured: z.boolean().default(false),
  tags: z.string().optional(),
  client: z.string().optional(),
  timeframe: z.string().optional(),
  software: z.string().optional(),
  overview: z.string().optional(),
  imageUrl: z.string().optional(),
  blurredImageUrl: z.string().optional(),
  videoUrls: z.array(z.string()).optional(),
  galleryImageUrls: z.array(z.string()).optional(),
  testimonialIds: z.array(z.string()).optional(),
  deliveryYear: z.string().optional(),
  deliveryMonth: z.string().optional(),
  noAi: z.boolean().default(false),
  aiDisclaimer: z.string().optional(),
  privacy: z.object({
    isPasswordProtected: z.boolean().default(false),
    password: z.string().optional(),
  }).optional(),
}).refine(data => {
    if (data.privacy?.isPasswordProtected && !data.privacy.password) {
        return false;
    }
    return true;
}, {
    message: "Password is required when project is protected.",
    path: ["privacy.password"],
});

type ProjectFormValues = z.infer<typeof formSchema>;

function slugify(text: string): string {
  return text
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Object URLs for local files, revoked when the files change or the form unmounts.
function useObjectUrls(files: File[]): string[] {
  const urls = useMemo(() => files.map((f) => URL.createObjectURL(f)), [files]);
  useEffect(() => () => urls.forEach((u) => URL.revokeObjectURL(u)), [urls]);
  return urls;
}

interface ProjectFormProps {
  project?: Project | null;
  onFinished: () => void;
}

export function ProjectForm({ project, onFinished }: ProjectFormProps) {
  const firestore = useFirestore();
  const storage = useStorage();
  const { toast } = useToast();
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [galleryPreviews, setGalleryPreviews] = useState<string[]>([]);
  const [imagesToDelete, setImagesToDelete] = useState<string[]>([]);
  const [videoPreviews, setVideoPreviews] = useState<string[]>([]);
  const [videosToDelete, setVideosToDelete] = useState<string[]>([]);
  // Files picked for upload. Kept in state (not read off the <input>) so picking again
  // adds to the earlier picks instead of replacing them.
  const [pendingGallery, setPendingGallery] = useState<File[]>([]);
  const [pendingVideos, setPendingVideos] = useState<File[]>([]);
  // Once the slug is edited by hand, stop overwriting it from the title.
  const [slugTouched, setSlugTouched] = useState(false);

  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      slug: '',
      description: '',
      featured: false,
      tags: '',
      client: '',
      timeframe: '',
      software: '',
      overview: '',
      imageUrl: '',
      blurredImageUrl: '',
      videoUrls: [],
      galleryImageUrls: [],
      testimonialIds: [],
      deliveryYear: '',
      deliveryMonth: '',
      noAi: false,
      aiDisclaimer: '',
      privacy: {
        isPasswordProtected: false,
        password: '',
      }
    },
  });

  // The existing testimonials (the About page pool) a project can pick from.
  const testimonialsQuery = useMemo(
    () => (firestore ? query(collection(firestore, 'testimonials'), orderBy('order')) : null),
    [firestore]
  );
  const { data: testimonialPool } = useFetchCollection<Testimonial>(testimonialsQuery);
  
  useEffect(() => {
    if (project) {
      form.reset({
        ...project,
        tags: project.tags?.join(', '),
        software: project.software?.join(', '),
      });
      setGalleryPreviews(project.galleryImages || []);
      setVideoPreviews(project.videoUrls || []);
      setImagesToDelete([]);
      setVideosToDelete([]);
      setPendingGallery([]);
      setPendingVideos([]);
      // Existing projects keep their slug: it is the page URL.
      setSlugTouched(true);
    } else {
      form.reset({
        title: '',
        slug: '',
        description: '',
        featured: false,
        tags: '',
        client: '',
        timeframe: '',
        software: '',
        overview: '',
        imageUrl: '',
        blurredImageUrl: '',
        videoUrls: [],
        galleryImageUrls: [],
        testimonialIds: [],
        deliveryYear: '',
        deliveryMonth: '',
        noAi: false,
        aiDisclaimer: '',
        privacy: {
            isPasswordProtected: false,
            password: ''
        }
      });
      setGalleryPreviews([]);
      setVideoPreviews([]);
      setImagesToDelete([]);
      setVideosToDelete([]);
      setPendingGallery([]);
      setPendingVideos([]);
      setSlugTouched(false);
    }
  }, [project, form]);

  const coverFile = form.watch('image')?.[0] as File | undefined;
  const blurredFile = form.watch('blurredImage')?.[0] as File | undefined;
  const coverFiles = useMemo(() => (coverFile ? [coverFile] : []), [coverFile]);
  const blurredFiles = useMemo(() => (blurredFile ? [blurredFile] : []), [blurredFile]);
  const coverPreview = useObjectUrls(coverFiles)[0] ?? project?.imageUrl;
  const blurredPreview = useObjectUrls(blurredFiles)[0] ?? project?.blurredImageUrl;
  const pendingGalleryUrls = useObjectUrls(pendingGallery);
  const pendingVideoUrls = useObjectUrls(pendingVideos);

  const addFiles = (setter: React.Dispatch<React.SetStateAction<File[]>>, input: HTMLInputElement) => {
    const picked = Array.from(input.files ?? []);
    // Clear the input so the same file can be picked again after removing it.
    input.value = '';
    if (picked.length === 0) return;
    setter((prev) => {
      const seen = new Set(prev.map((f) => `${f.name}:${f.size}:${f.lastModified}`));
      return [...prev, ...picked.filter((f) => !seen.has(`${f.name}:${f.size}:${f.lastModified}`))];
    });
  };

  const handleFileUpload = async (file: File, path: string): Promise<string> => {
    return new Promise((resolve, reject) => {
        if (!storage) {
            return reject(new Error("Firebase Storage not available."));
        }
        const storageRef = ref(storage, path);
        const uploadTask = uploadBytesResumable(storageRef, file);

        uploadTask.on('state_changed',
            (snapshot: UploadTaskSnapshot) => {
                const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                setUploadProgress(progress);
            },
            (error) => {
                console.error("Upload error:", error);
                toast({
                    variant: 'destructive',
                    title: 'Upload failed.',
                    description: error.message,
                });
                setUploadProgress(null);
                reject(error);
            },
            async () => {
                const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                resolve(downloadURL);
            }
        );
    });
};

const handleDeleteImage = (imageUrl: string) => {
    setGalleryPreviews(prev => prev.filter(url => url !== imageUrl));
    setImagesToDelete(prev => [...prev, imageUrl]);
};

const handleDeleteVideo = (videoUrl: string) => {
    setVideoPreviews(prev => prev.filter(url => url !== videoUrl));
    setVideosToDelete(prev => [...prev, videoUrl]);
};

const deleteFilesFromStorage = async (urls: string[]) => {
    if (!storage || urls.length === 0) return;
    const deletePromises = urls.map(url => {
        try {
            // Only delete files that are from Firebase Storage
            if (url.includes('firebasestorage.googleapis.com')) {
                const fileRef = ref(storage, url);
                // Already-missing files (e.g. dead entries being cleaned up) are fine.
                return deleteObject(fileRef).catch((err) => {
                    if (err?.code !== 'storage/object-not-found') throw err;
                });
            }
            return Promise.resolve(); // Don't try to delete external URLs
        } catch (error) {
            console.error(`Failed to create ref for URL: ${url}`, error);
            return Promise.resolve(); // Don't block other deletions
        }
    });
    await Promise.all(deletePromises).catch(err => {
        console.error("Error deleting files from storage:", err)
        toast({
            variant: "destructive",
            title: "Could not delete old file(s)",
            description: "Some old files might not have been deleted from storage."
        })
    });
};


  const onSubmit = async (data: ProjectFormValues) => {
    if (!firestore) return;
    
    setUploadProgress(0);

    try {
        await deleteFilesFromStorage(imagesToDelete);
        await deleteFilesFromStorage(videosToDelete);

        let imageUrl = project?.imageUrl || '';
        if (data.image?.[0]) {
            if(project?.imageUrl && project.imageUrl.includes('firebasestorage')) {
                await deleteFilesFromStorage([project.imageUrl]);
            }
            imageUrl = await handleFileUpload(data.image[0], `projects/${Date.now()}_${data.image[0].name}`);
        }

        let blurredImageUrl = project?.blurredImageUrl || '';
        if (data.blurredImage?.[0]) {
            if(project?.blurredImageUrl && project.blurredImageUrl.includes('firebasestorage')) {
                await deleteFilesFromStorage([project.blurredImageUrl]);
            }
            blurredImageUrl = await handleFileUpload(data.blurredImage[0], `projects/blurred/${Date.now()}_${data.blurredImage[0].name}`);
        }

        let newVideoUrls: string[] = [];
        if (pendingVideos.length > 0) {
            const uploadPromises = pendingVideos.map((file, i) =>
                handleFileUpload(file, `projects/videos/${Date.now()}_${i}_${file.name}`)
            );
            newVideoUrls = await Promise.all(uploadPromises);
        }

        const finalVideoUrls = [...videoPreviews, ...newVideoUrls];

        let newGalleryImageUrls: string[] = [];
        if (pendingGallery.length > 0) {
            const uploadPromises = pendingGallery.map((file, i) =>
                handleFileUpload(file, `projects/gallery/${Date.now()}_${i}_${file.name}`)
            );
            newGalleryImageUrls = await Promise.all(uploadPromises);
        }
        
        const finalGalleryImages = [...galleryPreviews, ...newGalleryImageUrls];
        
        setUploadProgress(null);

        const processedData = {
          ...data,
          tags: data.tags?.split(',').map(tag => tag.trim()).filter(Boolean) || [],
          software: data.software?.split(',').map(s => s.trim()).filter(Boolean) || [],
          imageUrl,
          blurredImageUrl,
          videoUrls: finalVideoUrls,
          galleryImages: finalGalleryImages,
        };
        
        delete (processedData as any).image;
        delete (processedData as any).blurredImage;
        delete (processedData as any).videos;
        delete (processedData as any).newGalleryImages; // This is the input element
        delete (processedData as any).galleryImageUrls;
        

        if (project) {
            const projectRef = doc(firestore, 'projects', project.id);
            await updateDoc(projectRef, processedData);
            toast({ title: 'Project updated successfully!' });
        } else {
            const projectsCol = collection(firestore, 'projects');
            await addDoc(projectsCol, processedData);
            toast({ title: 'Project added successfully!' });
        }
        
        onFinished();

    } catch (error) {
        console.error("Submission error:", error);
        setUploadProgress(null);
        toast({
            variant: 'destructive',
            title: 'Uh oh! Something went wrong.',
            description: error instanceof Error ? error.message : 'There was a problem with your request.',
        });
    }
  };
  
  const handleCancel = () => {
    onFinished();
  }

  const handleTextareaKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && (e.key === 'b' || e.key === 'i')) {
      e.preventDefault();
      const target = e.target as HTMLTextAreaElement;
      const { selectionStart, selectionEnd, value } = target;
      const tag = e.key === 'b' ? 'b' : 'i';
      
      const selectedText = value.substring(selectionStart, selectionEnd);
      const newText = `${value.substring(0, selectionStart)}<${tag}>${selectedText}</${tag}>${value.substring(selectionEnd)}`;

      form.setValue('overview', newText);

      setTimeout(() => {
        target.selectionStart = selectionStart + 3;
        target.selectionEnd = selectionEnd + 3;
      }, 0);
    }
  };

  const isPasswordProtected = form.watch('privacy.isPasswordProtected');

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="min-w-0 space-y-8 border p-8 rounded-lg">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Project Title"
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
                  <FormLabel>Slug</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="project-title"
                      {...field}
                      onChange={(e) => {
                        field.onChange(e);
                        // Emptying the field hands control back to the title.
                        setSlugTouched(e.target.value !== '');
                      }}
                    />
                  </FormControl>
                  {!project && (
                    <FormDescription>Generated from the title. Edit it to override.</FormDescription>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />
        </div>
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea placeholder="A detailed description of the project." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="overview"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Overview</FormLabel>
              <FormControl>
                <Textarea placeholder="A short overview of the project." {...field} onKeyDown={handleTextareaKeyDown} />
              </FormControl>
              <FormDescription>
                Use {'<b>'} for bold (Cmd+B) and {'<i>'} for italic (Cmd+I) text.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <FormField
              control={form.control}
              name="image"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cover Image</FormLabel>
                  <FormControl>
                    <Input type="file" accept="image/*" onChange={(e) => field.onChange(e.target.files)} />
                  </FormControl>
                  {coverPreview && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={coverPreview} alt="Cover preview" className="mt-2 h-32 w-32 rounded-md object-cover" />
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="blurredImage"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Blurred Cover Image (Optional)</FormLabel>
                  <FormControl>
                    <Input type="file" accept="image/*" onChange={(e) => field.onChange(e.target.files)} />
                  </FormControl>
                  {blurredPreview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={blurredPreview} alt="Blurred cover preview" className="mt-2 h-32 w-32 rounded-md object-cover" />
                  ) : (
                    <FormDescription>For locked projects.</FormDescription>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />
        </div>
        <FormField
          control={form.control}
          name="testimonialIds"
          render={({ field }) => {
            const selectedIds = field.value ?? [];
            const pool = testimonialPool ?? [];
            const available = pool.filter((t) => !selectedIds.includes(t.id));
            return (
              <FormItem className="space-y-4 rounded-lg border p-4">
                <FormLabel className="text-base font-medium">Testimonials (Optional)</FormLabel>
                {selectedIds.length > 0 && (
                  <ul className="space-y-2">
                    {selectedIds.map((id) => {
                      const t = pool.find((item) => item.id === id);
                      return (
                        <li key={id} className="flex items-start justify-between gap-4 rounded-md bg-muted p-3 text-sm">
                          <div className="min-w-0">
                            {t ? (
                              <>
                                <p className="font-medium">
                                  {t.name}
                                  {(t.role || t.company) && (
                                    <span className="font-normal text-muted-foreground">
                                      {' · '}{[t.role, t.company].filter(Boolean).join(', ')}
                                    </span>
                                  )}
                                </p>
                                <p className="truncate text-muted-foreground">{t.text}</p>
                              </>
                            ) : (
                              <p className="text-muted-foreground">Testimonial no longer exists</p>
                            )}
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 shrink-0"
                            aria-label="Remove testimonial"
                            onClick={() => field.onChange(selectedIds.filter((x) => x !== id))}
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </li>
                      );
                    })}
                  </ul>
                )}
                {/* value stays empty so the dropdown always reads as "Add a testimonial". */}
                <Select value="" onValueChange={(id) => field.onChange([...selectedIds, id])} disabled={available.length === 0}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={pool.length === 0 ? 'No testimonials yet' : available.length === 0 ? 'All testimonials added' : 'Add a testimonial'} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {available.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}{t.company ? `, ${t.company}` : ''} — {t.text.length > 50 ? `${t.text.slice(0, 50)}…` : t.text}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormDescription>
                  Shown on the project page above the gallery and final product. Manage the pool on the About admin page.
                </FormDescription>
                <FormMessage />
              </FormItem>
            );
          }}
        />
        <div className="space-y-4 rounded-lg border p-4">
            <h3 className="font-medium">Videos</h3>
            {videoPreviews.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {videoPreviews.map((url, index) => (
                        <div key={`${url}-${index}`} className="relative group bg-muted rounded-md aspect-video">
                            <video src={url} className="w-full h-full object-cover rounded-md" />
                            <Button
                                type="button"
                                variant="destructive"
                                size="icon"
                                className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => handleDeleteVideo(url)}
                            >
                                <XCircle className="h-4 w-4" />
                            </Button>
                        </div>
                    ))}
                </div>
            )}
            {pendingVideos.length > 0 && (
                <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">To upload on save ({pendingVideos.length})</p>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {pendingVideos.map((file, index) => (
                            <div key={`${file.name}-${file.lastModified}`} className="relative group bg-muted rounded-md aspect-video">
                                <video src={pendingVideoUrls[index]} className="w-full h-full object-cover rounded-md" />
                                <Button
                                    type="button"
                                    variant="destructive"
                                    size="icon"
                                    className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                    aria-label={`Remove ${file.name}`}
                                    onClick={() => setPendingVideos((prev) => prev.filter((_, i) => i !== index))}
                                >
                                    <XCircle className="h-4 w-4" />
                                </Button>
                            </div>
                        ))}
                    </div>
                </div>
            )}
            <div className="space-y-2">
                <Label htmlFor="project-new-videos">Add New Videos</Label>
                <Input id="project-new-videos" type="file" accept="video/*" multiple onChange={(e) => addFiles(setPendingVideos, e.target)} />
                <p className="text-sm text-muted-foreground">
                    You can select multiple videos, and pick more than once: new picks are added to the earlier ones.
                </p>
            </div>
        </div>
        <div className="space-y-4 rounded-lg border p-4">
            <h3 className="font-medium">Gallery Images</h3>
            {galleryPreviews.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {galleryPreviews.map((url, index) => (
                        <div key={`${url}-${index}`} className="relative group">
                            <Image src={url} alt="Gallery preview" width={150} height={150} className="rounded-md object-cover aspect-square" />
                            <Button
                                type="button"
                                variant="destructive"
                                size="icon"
                                className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => handleDeleteImage(url)}
                            >
                                <XCircle className="h-4 w-4" />
                            </Button>
                        </div>
                    ))}
                </div>
            )}
            {pendingGallery.length > 0 && (
                <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">To upload on save ({pendingGallery.length})</p>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {pendingGallery.map((file, index) => (
                            <div key={`${file.name}-${file.lastModified}`} className="relative group">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={pendingGalleryUrls[index]} alt={file.name} className="rounded-md object-cover aspect-square w-full" />
                                <Button
                                    type="button"
                                    variant="destructive"
                                    size="icon"
                                    className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                    aria-label={`Remove ${file.name}`}
                                    onClick={() => setPendingGallery((prev) => prev.filter((_, i) => i !== index))}
                                >
                                    <XCircle className="h-4 w-4" />
                                </Button>
                            </div>
                        ))}
                    </div>
                </div>
            )}
            <div className="space-y-2">
                <Label htmlFor="project-new-gallery">Add New Gallery Images</Label>
                <Input id="project-new-gallery" type="file" accept="image/*" multiple onChange={(e) => addFiles(setPendingGallery, e.target)} />
                <p className="text-sm text-muted-foreground">
                    You can select multiple images, and pick more than once: new picks are added to the earlier ones.
                </p>
            </div>
        </div>
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
             <FormField
              control={form.control}
              name="client"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Client</FormLabel>
                  <FormControl>
                    <Input placeholder="Client Name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="timeframe"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Timeframe</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. 3 weeks" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="tags"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tags (comma-separated)</FormLabel>
                  <FormControl>
                    <Input placeholder="Animation, 3D, VFX" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="software"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Software (comma-separated)</FormLabel>
                  <FormControl>
                    <Input placeholder="After Effects, Mocha Pro" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <FormField
            control={form.control}
            name="deliveryYear"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Delivery Year</FormLabel>
                <FormControl>
                  <Input placeholder="YYYY" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="deliveryMonth"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Delivery Month</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a month" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {months.map(month => (
                      <SelectItem key={month} value={month}>{month}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="featured"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">Featured Project</FormLabel>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />
        
        <div className="space-y-4 rounded-lg border p-4">
          <FormField
            control={form.control}
            name="noAi"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">No Generative AI</FormLabel>
                   <FormDescription>
                      Enable this if the project was made without using generative AI.
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />
           <FormField
              control={form.control}
              name="aiDisclaimer"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>AI Disclaimer (Optional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Explain how AI was used in this project..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
        </div>

        <div className="space-y-4 rounded-lg border p-4">
            <FormField
              control={form.control}
              name="privacy.isPasswordProtected"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Password Protected</FormLabel>
                    <FormDescription>
                        If enabled, the project page will require a password to view.
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            {isPasswordProtected && (
                 <FormField
                  control={form.control}
                  name="privacy.password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Project Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="Enter password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
            )}
        </div>

        {uploadProgress !== null && uploadProgress < 100 && (
          <div className="space-y-2">
            <Label>Uploading...</Label>
            <Progress value={uploadProgress} />
          </div>
        )}
        <div className="flex justify-end gap-4">
            <Button type="button" variant="outline" onClick={handleCancel}>Cancel</Button>
            <Button type="submit" disabled={uploadProgress !== null && uploadProgress < 100}>{project ? 'Update' : 'Add'} Project</Button>
        </div>
      </form>
    </Form>
  );
}
