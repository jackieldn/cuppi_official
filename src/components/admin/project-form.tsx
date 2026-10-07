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
import { collection, doc, addDoc, updateDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Project } from '@/lib/projects';
import { useEffect, useState } from 'react';
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
  galleryImages: z.any().optional(),
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
    }
  }, [project, form]);

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
                return deleteObject(fileRef);
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
        if (data.videos && data.videos.length > 0) {
            const uploadPromises = Array.from(data.videos).map((file: any) =>
                handleFileUpload(file, `projects/videos/${Date.now()}_${file.name}`)
            );
            newVideoUrls = await Promise.all(uploadPromises);
        }

        const finalVideoUrls = [...videoPreviews, ...newVideoUrls];

        let newGalleryImageUrls: string[] = [];
        if (data.galleryImages && data.galleryImages.length > 0) {
            const uploadPromises = Array.from(data.galleryImages).map((file: any) => 
                handleFileUpload(file, `projects/gallery/${Date.now()}_${file.name}`)
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
        delete (processedData as any).galleryImages; // This is the input element
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
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 border p-8 rounded-lg">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Project Title" {...field} />
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
                    <Input placeholder="project-title" {...field} />
                  </FormControl>
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
                  <FormDescription>
                    {project?.imageUrl && `Current image: ${project.imageUrl.substring(0,30)}...`}
                  </FormDescription>
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
                  <FormDescription>
                    {project?.blurredImageUrl ? `Current image: ${project.blurredImageUrl.substring(0,30)}...` : "For locked projects."}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
        </div>
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
             <FormField
                control={form.control}
                name="videos"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Add New Videos</FormLabel>
                    <FormControl>
                      <Input type="file" accept="video/*" multiple onChange={(e) => field.onChange(e.target.files)} />
                    </FormControl>
                     <FormDescription>
                        You can select multiple videos.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
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
             <FormField
                control={form.control}
                name="galleryImages"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Add New Gallery Images</FormLabel>
                    <FormControl>
                      <Input type="file" accept="image/*" multiple onChange={(e) => field.onChange(e.target.files)} />
                    </FormControl>
                     <FormDescription>
                        You can select multiple images.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
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
