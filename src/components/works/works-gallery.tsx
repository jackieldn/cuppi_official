'use client';

import Image from "next/image";
import Link from "next/link";
import { Skeleton } from '@/components/ui/skeleton';
import { useEffect, useState, useMemo } from "react";
import { Project } from "@/lib/projects";
import { Button } from "@/components/ui/button";
import { cn, getResizedImageUrl } from "@/lib/utils";
import { Lock } from "lucide-react";

interface WorksGalleryProps {
  initialProjects: Project[] | null;
  isLoading?: boolean;
}

const filterTags = ["All", "Motion graphics", "Compositing", "Clean-up", "Green screen", "Rotoscoping", "VFX", "Animation"];
type SortOrder = "newest" | "oldest";

export function WorksGallery({ initialProjects, isLoading }: WorksGalleryProps) {
  const [isClient, setIsClient] = useState(false);
  const [selectedTag, setSelectedTag] = useState("All");
  const [sortOrder, setSortOrder] = useState<SortOrder>("newest");

  useEffect(() => {
    setIsClient(true);
  }, []);

  const filteredAndSortedProjects = useMemo(() => {
    if (!initialProjects) return [];
    
    // Filter by tag (case-insensitive)
    const filtered = selectedTag === "All"
      ? initialProjects
      : initialProjects.filter(project => 
          project.tags?.some(tag => tag.toLowerCase() === selectedTag.toLowerCase())
        );

    // Sort by year
    return filtered.sort((a, b) => {
      const yearA = a.deliveryYear ? parseInt(a.deliveryYear, 10) : 0;
      const yearB = b.deliveryYear ? parseInt(b.deliveryYear, 10) : 0;

      if (yearA === 0 && yearB !== 0) return 1;
      if (yearB === 0 && yearA !== 0) return -1;
      
      if (sortOrder === 'newest') {
        return yearB - yearA;
      } else {
        return yearA - yearB;
      }
    });
  }, [initialProjects, selectedTag, sortOrder]);

  const showSkeletons = isLoading || !isClient;

  return (
    <section className="py-24 sm:py-32">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-3xl">
          <h1 className="font-headline text-5xl font-bold tracking-tight text-accent sm:text-6xl">
            Works
          </h1>
          <div className="mt-8 space-y-6 text-lg leading-8 text-foreground/80">
            <p>
              These are my favourite projects. I can't include every single
              animation that I've created because that'd be a LOT and it would
              be very boring. I'm very proud of these ones and I hope you'll
              find them interesting.
            </p>
            <p>Grab some popcorn and enjoy! 🍿</p>
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
            <div className="flex items-center gap-2 rounded-full border p-1">
                <Button
                    variant={sortOrder === 'newest' ? 'secondary' : 'ghost'}
                    size="sm"
                    onClick={() => setSortOrder('newest')}
                    className="rounded-full"
                >
                    Newest First
                </Button>
                <Button
                    variant={sortOrder === 'oldest' ? 'secondary' : 'ghost'}
                    size="sm"
                    onClick={() => setSortOrder('oldest')}
                    className="rounded-full"
                >
                    Oldest First
                </Button>
            </div>
        </div>

        <div className="mx-auto mt-12 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {showSkeletons &&
            Array.from({ length: 12 }).map((_, index) => (
              <div key={index} className="aspect-square">
                <Skeleton className="h-full w-full rounded-2xl" />
              </div>
            ))}
          {!showSkeletons && filteredAndSortedProjects.map((project) => {
            const isLocked = project.privacy?.isPasswordProtected;
            const displayImageUrl = (isLocked && project.blurredImageUrl) ? project.blurredImageUrl : project.imageUrl;

            return (
              displayImageUrl && (
                <Link
                  href={`/works/${project.slug}`}
                  key={project.id}
                  className="group relative block overflow-hidden rounded-2xl shadow-lg transition-all duration-300 ease-in-out hover:-translate-y-1 hover:shadow-2xl hover:ring-4 hover:ring-accent"
                >
                  <div className="aspect-square">
                    <Image
                      src={getResizedImageUrl(displayImageUrl, '600x600')}
                      alt={project.description || ''}
                      fill
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
                      data-ai-hint="project cover"
                    />
                  </div>
                  {isLocked && (
                      <div className="absolute top-3 right-3 flex h-8 w-8 items-center justify-center rounded-full bg-background/80 backdrop-blur-sm">
                          <Lock className="h-4 w-4 text-foreground" />
                      </div>
                  )}
                </Link>
              )
            )
          })}
        </div>
      </div>
    </section>
  );
}
