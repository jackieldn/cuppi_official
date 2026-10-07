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
import { ChevronLeft, ChevronRight, Palette } from "lucide-react";

type HobbyImage = {
  id: string;
  imageUrl: string;
  createdAt: any;
  tags?: string[];
  order?: number;
  width: number;
  height: number;
}

interface FreeTimeGalleryProps {
    initialImages: HobbyImage[];
}

const filterTags = ["All", "Physical", "3D", "Graphics", "Comics"];

const layoutPattern = [
  "sm:col-span-2",
  "sm:col-span-1",
  "sm:col-span-3",
  "sm:col-span-1",
  "sm:col-span-2",
];

export function FreeTimeGallery({ initialImages }: FreeTimeGalleryProps) {
  const [isClient, setIsClient] = useState(false);
  const [skeletonLayouts, setSkeletonLayouts] = useState<string[]>([]);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  const [selectedTag, setSelectedTag] = useState("All");
  const [images] = useState(initialImages);

  useEffect(() => {
    setIsClient(true);
    const layouts = Array.from({ length: 12 }, (_, i) => layoutPattern[i % layoutPattern.length]);
    setSkeletonLayouts(layouts);
  }, []);


  const filteredAndSortedImages = useMemo(() => {
    if (!images) return [];
    
    const filtered = selectedTag === "All"
      ? images
      : images.filter(image => 
          image.tags?.some(tag => tag.toLowerCase() === selectedTag.toLowerCase())
        );

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
  }, [images, selectedTag]);

  const showSkeletons = !isClient;

  const handleNext = useCallback(() => {
    if (selectedImageIndex === null) return;
    setSelectedImageIndex((prevIndex) => (prevIndex! + 1) % filteredAndSortedImages.length);
  }, [selectedImageIndex, filteredAndSortedImages.length]);

  const handlePrev = useCallback(() => {
    if (selectedImageIndex === null) return;
    setSelectedImageIndex((prevIndex) => (prevIndex! - 1 + filteredAndSortedImages.length) % filteredAndSortedImages.length);
  }, [selectedImageIndex, filteredAndSortedImages.length]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (selectedImageIndex === null) return;
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
  }, [selectedImageIndex, handleNext, handlePrev]);

  useEffect(() => {
    if (selectedImageIndex !== null && filteredAndSortedImages.length > 1) {
      const nextIndex = (selectedImageIndex + 1) % filteredAndSortedImages.length;
      const nextImage = new window.Image();
      nextImage.src = filteredAndSortedImages[nextIndex].imageUrl;
      
      const prevIndex = (selectedImageIndex - 1 + filteredAndSortedImages.length) % filteredAndSortedImages.length;
      const prevImage = new window.Image();
      prevImage.src = filteredAndSortedImages[prevIndex].imageUrl;
    }
  }, [selectedImageIndex, filteredAndSortedImages]);

  const selectedImage = selectedImageIndex !== null ? filteredAndSortedImages[selectedImageIndex] : null;

  return (
    <section className="py-24 sm:py-32">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-3xl">
           <div className="flex items-center gap-4 mb-4">
             <Palette className="h-10 w-10 text-accent" />
             <h1 className="font-headline text-5xl font-bold tracking-tight text-accent sm:text-6xl">
                Free time
             </h1>
          </div>
          <div className="mt-8 space-y-6 text-lg leading-8 text-foreground/80">
            <p>
              It's not just animations for me. I also love experimenting with real-life-touchable-things or just scribbling and drawing comics.
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
          {!showSkeletons && filteredAndSortedImages.map((image, index) => (
              <div 
                key={image.id}
                onClick={() => setSelectedImageIndex(index)}
                className={cn(
                  "group relative block cursor-pointer overflow-hidden rounded-2xl shadow-lg transition-all duration-300 ease-in-out hover:-translate-y-1 hover:shadow-2xl hover:ring-4 hover:ring-accent",
                   layoutPattern[index % layoutPattern.length]
                )}
              >
                  <div className="absolute inset-0">
                    <Image
                      src={getResizedImageUrl(image.imageUrl, '600x400')}
                      alt="A hobby image from the gallery"
                      fill
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      data-ai-hint="hobby gallery image"
                    />
                  </div>
              </div>
          ))}
        </div>
      </div>

       <Dialog open={selectedImageIndex !== null} onOpenChange={() => setSelectedImageIndex(null)}>
        <DialogContent className="max-w-4xl p-0">
           <DialogTitle className="sr-only">Enlarged image from gallery</DialogTitle>
           <DialogDescription className="sr-only">
             Image {selectedImageIndex !== null ? selectedImageIndex + 1 : 0} of {filteredAndSortedImages.length}. Use arrow keys to navigate.
           </DialogDescription>
          {selectedImage && (
             <div className="relative" style={{ aspectRatio: `${selectedImage.width} / ${selectedImage.height}` }}>
               <Image
                  src={selectedImage.imageUrl}
                  alt="A hobby image from the gallery"
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
