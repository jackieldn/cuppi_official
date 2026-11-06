'use client';

import Image from "next/image";
import { Skeleton } from '@/components/ui/skeleton';
import { useEffect, useState, useMemo } from "react";
import { ImageLightbox } from "@/components/ui/image-lightbox";
import { cn, getResizedImageUrl } from "@/lib/utils";
import { Button } from "../ui/button";
import { Reveal } from "../ui/reveal";

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

  const lightboxImages = useMemo(
    () => filteredAndSortedSnaps.map((item) => ({ src: item.imageUrl, alt: "A snap from the gallery" })),
    [filteredAndSortedSnaps],
  );


  return (
    <section className="py-24 sm:py-32">
      <div className="container mx-auto px-4">
        <Reveal className="mx-auto max-w-3xl">
          <h1 className="font-headline text-5xl font-bold tracking-tight text-accent sm:text-6xl">
            Best of Snaps 🍭
          </h1>
          <div className="mt-8 space-y-6 text-lg leading-8 text-foreground/80">
            <p>
              I love details and if I have the time (and even when I don't), I try to perfect (but not overdo) the overall design. Finding the right balance, fiddling with trillions of settings to make everything pixel perfect. *chefs kiss* 🧑‍🍳
            </p>
          </div>
        </Reveal>

        <Reveal stagger={150} className="flex justify-center items-center flex-wrap gap-4 mt-16">
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
        </Reveal>

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
              // The grid item carries the column span; the tile inside keeps the hover styling.
              <Reveal
                key={snap.id}
                stagger={90}
                className={layoutPattern[index % layoutPattern.length]}
              >
              <div
                onClick={() => setSelectedSnapIndex(index)}
                className="group relative block h-full cursor-pointer overflow-hidden rounded-2xl shadow-lg transition-all duration-300 ease-in-out hover:-translate-y-1 hover:shadow-2xl hover:ring-4 hover:ring-accent"
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
              </Reveal>
          ))}
        </div>
      </div>

      <ImageLightbox
        images={lightboxImages}
        index={selectedSnapIndex}
        onIndexChange={setSelectedSnapIndex}
        title="Enlarged snap from gallery"
      />
    </section>
  );
}
