'use client';

import { notFound, useParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronDown } from "lucide-react";
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
import { App, GalleryImage } from "@/lib/about-types";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn, getResizedImageUrl } from "@/lib/utils";

export default function AppDetailsPage() {
  const firestore = useFirestore();
  const params = useParams();
  const slug = params.slug as string;
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  const appsQuery = useMemo(() => {
    if (!firestore || !slug) return null;
    return query(collection(firestore, 'apps'), where('slug', '==', slug));
  }, [firestore, slug]);

  const { data: apps, isLoading } = useFetchCollection<App>(appsQuery);
  const app = useMemo(() => apps?.[0], [apps]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  if (!app) {
    notFound();
  }

  const sortedUpdateHistory = [...(app.updateHistory || [])].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const visibleUpdates = sortedUpdateHistory.slice(0, 10);
  const hiddenUpdates = sortedUpdateHistory.slice(10);

  const getPlatformIcon = (platform: string) => {
    // Return an icon based on the platform string
    // This is just a placeholder, you can use actual icons
    switch (platform.toLowerCase()) {
      case 'ios': return '📱';
      case 'android': return '🤖';
      case 'web': return '🌐';
      case 'macos': return '💻';
      case 'windows': return '🪟';
      default: return '➡️';
    }
  };


  return (
    <div className="relative flex flex-col">
       <Button
        asChild
        variant="outline"
        className="absolute top-8 left-8 z-10 h-12 w-12 rounded-full"
        aria-label="Back to apps"
      >
        <Link href="/apps">
          <ChevronLeft className="h-6 w-6" />
        </Link>
      </Button>
      <main className="flex-1">
        <section className="bg-card py-24 sm:py-32">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 items-start gap-12 lg:grid-cols-2">
              {app.coverImage && (
                <div className="relative aspect-square w-full max-w-md mx-auto lg:max-w-none lg:mx-0">
                  <Image
                    src={getResizedImageUrl(app.coverImage.url, '800x800')}
                    alt={app.description || ''}
                    fill
                    className="object-cover rounded-2xl"
                  />
                </div>
              )}
              <div className="space-y-6">
                <h1 className="font-headline text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
                  {app.title}
                </h1>
                <div
                  className="text-lg leading-8 text-foreground/80"
                  dangerouslySetInnerHTML={{ __html: app.description }}
                />
                 <div className="space-y-4 text-foreground/80">
                  <div className="flex items-center gap-2"><strong>Status:</strong> <Badge variant={app.availability === 'Available' ? 'default' : 'secondary'}>{app.availability}</Badge></div>
                  <p><strong>Released:</strong> {format(new Date(app.releaseDate), "MMMM dd, yyyy")}</p>
                   {app.link && <p><strong>Link:</strong> <a href={app.link} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{app.link}</a></p>}
                  <div><strong>Platforms:</strong></div>
                  <div className="flex flex-wrap gap-2">
                      {app.platforms?.map((platform) => (
                        <Badge key={platform} variant="secondary">{getPlatformIcon(platform)} {platform}</Badge>
                      ))}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {app.tags?.map((tag: string) => (
                    <Badge key={tag} variant="secondary">{tag}</Badge>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {app.galleryImages && app.galleryImages.length > 0 && (
          <section className="py-24 sm:py-32">
            <div className="container mx-auto px-4">
              <h2 className="text-center font-headline text-3xl font-bold sm:text-4xl mb-16">Gallery</h2>
              <div className="columns-1 sm:columns-2 lg:columns-3 gap-8 space-y-8">
                {app.galleryImages.map((image, index) => (
                  <Dialog key={index}>
                    <DialogTrigger asChild>
                      <div className="group break-inside-avoid relative block cursor-pointer overflow-hidden rounded-2xl shadow-lg transition-all duration-300 ease-in-out hover:-translate-y-1 hover:shadow-2xl hover:ring-4 hover:ring-accent">
                        <Image
                          src={getResizedImageUrl(image.url, '800x600')}
                          alt={`Gallery image ${index + 1}`}
                          width={image.width}
                          height={image.height}
                          className="object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                      </div>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl p-0">
                      <DialogTitle className="sr-only">Enlarged gallery image for {app.title}</DialogTitle>
                      <DialogDescription className="sr-only">Image {index + 1} from the gallery for {app.title}.</DialogDescription>
                      <div className="relative" style={{ aspectRatio: `${image.width} / ${image.height}`}}>
                        <Image src={image.url} alt={`Gallery image ${index + 1}`} fill className="object-contain" />
                      </div>
                    </DialogContent>
                  </Dialog>
                ))}
              </div>
            </div>
          </section>
        )}

        {sortedUpdateHistory.length > 0 && (
          <section className="bg-card py-24 sm:py-32">
            <div className="container mx-auto max-w-3xl px-4">
              <h2 className="text-center font-headline text-3xl font-bold sm:text-4xl mb-16">Update History</h2>
              <Collapsible open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
                <div className="relative">
                  {visibleUpdates.map((update, index) => (
                    <div key={update.id} className="relative pl-12 pb-8">
                      <div className="absolute left-0 w-8 h-8 bg-primary rounded-full ring-8 ring-card z-10 flex items-center justify-center text-primary-foreground font-bold">
                        {sortedUpdateHistory.length - index}
                      </div>
                      {! (index === visibleUpdates.length - 1 && hiddenUpdates.length === 0) &&
                        <div className="absolute left-4 top-2 w-0.5 h-full bg-border" />
                      }
                      <p className="font-semibold text-muted-foreground">{format(new Date(update.date), "MMMM dd, yyyy")} {update.version && ` - v${update.version}`}</p>
                      <p className="mt-1 text-foreground/80 whitespace-pre-line">{update.description}</p>
                    </div>
                  ))}
                  <CollapsibleContent>
                    {hiddenUpdates.map((update, index) => (
                      <div key={update.id} className="relative pl-12 pb-8">
                        <div className="absolute left-0 w-8 h-8 bg-primary rounded-full ring-8 ring-card z-10 flex items-center justify-center text-primary-foreground font-bold">
                           {hiddenUpdates.length - index + (visibleUpdates.length > 0 ? 0 : 10)}
                        </div>
                        {index < hiddenUpdates.length - 1 &&
                          <div className="absolute left-4 top-2 w-0.5 h-full bg-border" />
                        }
                        <p className="font-semibold text-muted-foreground">{format(new Date(update.date), "MMMM dd, yyyy")} {update.version && ` - v${update.version}`}</p>
                        <p className="mt-1 text-foreground/80 whitespace-pre-line">{update.description}</p>
                      </div>
                    ))}
                  </CollapsibleContent>
                </div>
                 {hiddenUpdates.length > 0 && (
                  <div className="text-center mt-4">
                    <CollapsibleTrigger asChild>
                       <Button variant="outline" className="group">
                        <span>{isHistoryOpen ? 'Show less' : 'Show more'}</span>
                        <ChevronDown className={cn("ml-2 h-4 w-4 transition-transform duration-300", isHistoryOpen && "rotate-180")} />
                      </Button>
                    </CollapsibleTrigger>
                  </div>
                )}
              </Collapsible>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
