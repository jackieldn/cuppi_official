'use client';
import { notFound, useParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useMemo, useState } from 'react';
import { useFetchCollection } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import { useFirestore } from '@/firebase/provider';
import { Skeleton } from "@/components/ui/skeleton";
import { Project } from "@/lib/projects";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { NoAiIcon } from "@/components/icons/no-ai-icon";
import { getResizedImageUrl } from "@/lib/utils";

export default function ProjectPage() {
  const firestore = useFirestore();
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [password, setPassword] = useState('');
  const { toast } = useToast();
  const params = useParams();
  const slug = params.slug as string;

  const projectsQuery = useMemo(() => {
    if (!firestore || !slug) return null;
    return query(collection(firestore, 'projects'), where('slug', '==', slug));
  }, [firestore, slug]);

  const { data: projects, isLoading } = useFetchCollection<Project>(projectsQuery);

  const project = useMemo(() => {
    if (!projects || projects.length === 0) return null;
    return projects[0];
  }, [projects]);

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (project?.privacy?.password === password) {
      setIsUnlocked(true);
      toast({ title: "Project unlocked!" });
    } else {
      toast({
        variant: "destructive",
        title: "Error",
        description: "The key you entered is incorrect.",
      });
    }
  };
  
  if (isLoading) {
    return (
      <div className="relative flex flex-col">
        <main className="flex-1">
          <section className="bg-card py-24 sm:py-32">
            <div className="container mx-auto px-4">
              <div className="grid grid-cols-1 items-start gap-12 lg:grid-cols-2">
                <Skeleton className="relative aspect-square w-full max-w-md mx-auto lg:max-w-none lg:mx-0 rounded-2xl" />
                <div className="space-y-6">
                  <Skeleton className="h-12 w-3/4" />
                  <Skeleton className="h-6 w-full" />
                  <Skeleton className="h-6 w-2/3" />
                  <div className="space-y-4">
                    <Skeleton className="h-5 w-1/2" />
                    <Skeleton className="h-5 w-1/3" />
                    <Skeleton className="h-5 w-1/4" />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Skeleton className="h-6 w-20 rounded-full" />
                    <Skeleton className="h-6 w-24 rounded-full" />
                    <Skeleton className="h-6 w-16 rounded-full" />
                  </div>
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>
    );
  }

  if (!project) {
    notFound();
  }

  if (project.privacy?.isPasswordProtected && !isUnlocked) {
     return (
        <div className="flex min-h-screen items-center justify-center bg-background">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="font-headline text-2xl">Project Locked</CardTitle>
              <CardDescription>Due to licensing and contractual obligations, this project is key protected. Please enter the key to view.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePasswordSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="password">Key</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full">
                  Unlock
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      )
  }

  const galleryImages = project.galleryImages || [];
  const videoUrls = project.videoUrls || [];

  const galleryImageObjects = galleryImages.map((url, i) => ({
      id: `${project.id}-gallery-${i}`,
      imageUrl: url,
      description: project.title,
      imageHint: "project gallery"
  }))

  const deliveryDate = [project.deliveryMonth, project.deliveryYear].filter(Boolean).join(", ");

  return (
    <div className="relative flex flex-col">
       <Button
        asChild
        variant="outline"
        className="absolute top-8 left-8 z-10 h-12 w-12 rounded-full"
        aria-label="Back to works"
      >
        <Link href="/works">
          <ChevronLeft className="h-6 w-6" />
        </Link>
      </Button>
      <main className="flex-1">
        {/* Section 1: Project Info */}
        <section className="bg-card py-24 sm:py-32">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 items-start gap-12 lg:grid-cols-2">
              {project.imageUrl && (
                <div className="relative aspect-square w-full max-w-md mx-auto lg:max-w-none lg:mx-0">
                  <Image
                    src={getResizedImageUrl(project.imageUrl, '800x800')}
                    alt={project.description || ''}
                    fill
                    className="object-cover rounded-2xl"
                    data-ai-hint="project cover"
                  />
                </div>
              )}
              <div className="space-y-6">
                 <div className="flex items-center gap-4">
                  <h1 className="font-headline text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
                    {project.title}
                  </h1>
                </div>
                {project.overview && (
                  <div
                    className="text-lg leading-8 text-foreground/80"
                    dangerouslySetInnerHTML={{ __html: project.overview }}
                  />
                )}
                <div className="space-y-4 text-foreground/80">
                  <p><strong>Client:</strong> {project.client}</p>
                  <p><strong>Timeframe:</strong> {project.timeframe}</p>
                  <p><strong>Software:</strong> {project.software?.join(", ")}</p>
                  {deliveryDate && <p><strong>Delivered:</strong> {deliveryDate}</p>}
                  {project.noAi && (
                    <p className="flex items-center gap-2">
                      <NoAiIcon className="h-6 w-6" />
                      <strong>This project was built without using Generative AI.</strong>
                    </p>
                  )}
                  {project.aiDisclaimer && <p><strong>AI Disclaimer:</strong> {project.aiDisclaimer}</p>}
                </div>
                <div className="flex flex-wrap gap-2">
                  {project.tags?.map((tag: string) => (
                    <Badge key={tag} variant="secondary">{tag}</Badge>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Section 2: Gallery */}
        {galleryImageObjects.length > 0 && (
          <section className="py-24 sm:py-32">
            <div className="container mx-auto px-4">
              <h2 className="text-center font-headline text-3xl font-bold sm:text-4xl mb-16">
                Gallery
              </h2>
              <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
                {galleryImageObjects.map((image) => (
                  image.imageUrl && (
                    <Dialog key={image.id}>
                      <DialogTrigger asChild>
                        <div className="group relative block cursor-pointer overflow-hidden rounded-2xl shadow-lg transition-all duration-300 ease-in-out hover:-translate-y-1 hover:shadow-2xl hover:ring-4 hover:ring-accent">
                          <div className="aspect-video">
                            <Image
                              src={getResizedImageUrl(image.imageUrl, '600x338')}
                              alt={image.description || ''}
                              fill
                              className="object-cover transition-transform duration-300 group-hover:scale-105"
                              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                              data-ai-hint={image.imageHint}
                            />
                          </div>
                        </div>
                      </DialogTrigger>
                      <DialogContent className="max-w-4xl p-0">
                        <DialogTitle className="sr-only">{project.title}</DialogTitle>
                        <DialogDescription className="sr-only">
                          Enlarged gallery image for {project.title}.
                        </DialogDescription>
                        <div className="relative aspect-video">
                           <Image
                              src={image.imageUrl}
                              alt={image.description || ''}
                              fill
                              className="object-contain"
                            />
                        </div>
                      </DialogContent>
                    </Dialog>
                  )
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Section 3: Videos */}
        {videoUrls.length > 0 && (
          <section className="bg-card py-24 sm:py-32">
            <div className="container mx-auto px-4">
              <h2 className="text-center font-headline text-3xl font-bold sm:text-4xl mb-16">
                Final Product
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-6xl mx-auto">
                {videoUrls.map((videoUrl, index) => {
                  const isYoutube = videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be');
                  return (
                    <div
                      key={index}
                      className="relative w-full aspect-video overflow-hidden rounded-2xl shadow-2xl bg-black"
                    >
                      {isYoutube ? (
                        <iframe
                          src={videoUrl}
                          title={`Project Video ${index + 1}`}
                          frameBorder="0"
                          allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                          className="absolute top-0 left-0 w-full h-full"
                        ></iframe>
                      ) : (
                        <video
                          src={videoUrl}
                          controls
                          playsInline
                          className="absolute top-0 left-0 w-full h-full object-contain"
                        />
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
