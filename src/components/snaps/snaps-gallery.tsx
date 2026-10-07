'use client';

import Image from "next/image";
import { Skeleton } from '@/components/ui/skeleton';
import { useEffect, useState, useMemo, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { cn, getResizedImageUrl } from "@/lib/utils";
import { Button } from "../ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

type Snap = {
  id: string;
  imageUrl: string;
  createdAt: any;
  tags?: string[];
  order?: number;
  width: number;
  height: number;
}

interface SnapsGalleryProps {
    initialSnaps: Snap[];
}

const filterTags = ["All", "Motion graphics", "VFX", "Clean-up", "Compositing", "3D", "2D", "2.5D", "Social media", "Broadcasting"];

const layoutPattern = [
  "sm:col-span-2",
  "sm:col-span-1",
  "sm:col-span-3",
  "sm:col-span-1",
  "sm:col-span-2",
];

export function SnapsGallery({ initialSnaps }: SnapsGalleryProps) {
  const [isClient, setIsClient] = useState(false);
  const [skeletonLayouts, setSkeletonLayouts] = useState<string[]>([]);
  const [selectedSnapIndex, setSelectedSnapIndex] = useState<number | null>(null);
  const [selectedTag, setSelectedTag] = useState("All");
  const [snaps] = useState(initialSnaps);

  useEffect(() => {
    setIsClient(true);
    // Generate a fixed pattern for skeletons to avoid hydration mismatch
    const layouts = Array.from({ length: 12 }, (_, i) => layoutPattern[i % layoutPattern.length]);
    setSkeletonLayouts(layouts);
  }, []);

  const filteredAndSortedSnaps = useMemo(() => {
    if (!snaps) return [];
    
    // Filter by tag
    const filtered = selectedTag === "All"
      ? snaps
      : snaps.filter(snap => 
          snap.tags?.some(tag => tag.toLowerCase() === selectedTag.toLowerCase())
        );

    // Then sort by order and date
    return filtered.sort((a, b) => {
      const orderA = a.order ?? Infinity;
      const orderB = b.order ?? Infinity;
      if (orderA !== orderB) {
        return orderA - orderB;
      }
      // Firestore Timestamps need to be handled carefully
      const dateA = a.createdAt?.seconds ? a.createdAt.seconds * 1000 : new Date(a.createdAt).getTime();
      const dateB = b.createdAt?.seconds ? b.createdAt.seconds * 1000 : new Date(b.createdAt).getTime();
      return dateB - dateA;
    });
  }, [snaps, selectedTag]);

  const showSkeletons = !isClient;

  const handleNext = useCallback(() => {
    if (selectedSnapIndex === null) return;
    setSelectedSnapIndex((prevIndex) => (prevIndex! + 1) % filteredAndSortedSnaps.length);
  }, [selectedSnapIndex, filteredAndSortedSnaps.length]);

  const handlePrev = useCallback(() => {
    if (selectedSnapIndex === null) return;
    setSelectedSnapIndex((prevIndex) => (prevIndex! - 1 + filteredAndSortedSnaps.length) % filteredAndSortedSnaps.length);
  }, [selectedSnapIndex, filteredAndSortedSnaps.length]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (selectedSnapIndex === null) return;
      if (e.key === 'ArrowRight') {
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedSnapIndex, handleNext, handlePrev]);

  // Preloading effect
  useEffect(() => {
    if (selectedSnapIndex !== null && filteredAndSortedSnaps.length > 1) {
      // Preload next image
      const nextIndex = (selectedSnapIndex + 1) % filteredAndSortedSnaps.length;
      const nextImage = new window.Image();
      nextImage.src = filteredAndSortedSnaps[nextIndex].imageUrl;
      
      // Preload previous image
      const prevIndex = (selectedSnapIndex - 1 + filteredAndSortedSnaps.length) % filteredAndSortedSnaps.length;
      const prevImage = new window.Image();
      prevImage.src = filteredAndSortedSnaps[prevIndex].imageUrl;
    }
  }, [selectedSnapIndex, filteredAndSortedSnaps]);


  const selectedSnap = selectedSnapIndex !== null ? filteredAndSortedSnaps[selectedSnapIndex] : null;

  return (
    <section className="py-24 sm:py-32">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-3xl">
          <h1 className="font-headline text-5xl font-bold tracking-tight text-accent sm:text-6xl">
            Best of Snaps 🍭
          </h1>
          <div className="mt-8 space-y-6 text-lg leading-8 text-foreground/80">
            <p>
              I love details and if I have the time (and even when I don't), I try to perfect (but not overdo) the overall design. Finding the right balance, fiddling with trillions of settings to make everything pixel perfect. *chefs kiss* 🧑‍🍳
            </p>
          </div>
        </div>

        <div className="flex justify-center items-center flex-wrap gap-4 mt-16">
            <div className="flex flex-wrap justify-center gap-2">
              {filterTags.map((tag) => (
                <Button
                  key={tag}
                  variant={selectedTag === tag ? "default" : "outline"}
                  onClick={() => setSelectedTag(tag)}
                  className={cn("rounded-full transition-all", {
                    "bg-primary text-primary-foreground": selectedTag === tag,
                  })}
                >
                  {tag}
                </Button>
              ))}
            </div>
        </div>

        <div 
          className="mx-auto mt-12 grid grid-cols-1 sm:grid-cols-6 gap-4"
          style={{ gridAutoRows: '200px' }}
        >
          {showSkeletons &&
            skeletonLayouts.map((layoutClass, index) => (
              <div key={index} className={cn("rounded-2xl", layoutClass)}>
                <Skeleton className="h-full w-full" />
              </div>
            ))}
          {!showSkeletons && filteredAndSortedSnaps.map((snap, index) => (
              <div 
                key={snap.id}
                onClick={() => setSelectedSnapIndex(index)}
                className={cn(
                  "group relative block cursor-pointer overflow-hidden rounded-2xl shadow-lg transition-all duration-300 ease-in-out hover:-translate-y-1 hover:shadow-2xl hover:ring-4 hover:ring-accent",
                   layoutPattern[index % layoutPattern.length]
                )}
              >
                  <div className="absolute inset-0">
                    <Image
                      src={getResizedImageUrl(snap.imageUrl, '600x400')}
                      alt="A snap from the gallery"
                      fill
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      data-ai-hint="gallery snap"
                    />
                  </div>
              </div>
          ))}
        </div>
      </div>

       <Dialog open={selectedSnapIndex !== null} onOpenChange={() => setSelectedSnapIndex(null)}>
        <DialogContent className="max-w-4xl p-0">
           <DialogTitle className="sr-only">Enlarged snap from gallery</DialogTitle>
           <DialogDescription className="sr-only">
             Image {selectedSnapIndex !== null ? selectedSnapIndex + 1 : 0} of {filteredAndSortedSnaps.length}. Use arrow keys to navigate.
           </DialogDescription>
          {selectedSnap && (
             <div className="relative" style={{ aspectRatio: `${selectedSnap.width} / ${selectedSnap.height}` }}>
               <Image
                  src={selectedSnap.imageUrl}
                  alt="A snap from the gallery"
                  fill
                  className="object-contain"
                  priority={true}
                />
            </div>
          )}
           <Button 
            variant="ghost" 
            size="icon" 
            onClick={handlePrev}
            className="absolute left-2 top-1/2 -translate-y-1/2 h-12 w-12 rounded-full bg-black/30 text-white hover:bg-black/50 hover:text-white"
            aria-label="Previous image"
           >
             <ChevronLeft className="h-8 w-8" />
           </Button>
           <Button 
            variant="ghost" 
            size="icon" 
            onClick={handleNext}
            className="absolute right-2 top-1/2 -translate-y-1/2 h-12 w-12 rounded-full bg-black/30 text-white hover:bg-black/50 hover:text-white"
            aria-label="Next image"
           >
             <ChevronRight className="h-8 w-8" />
           </Button>
        </DialogContent>
      </Dialog>
    </section>
  );
}
