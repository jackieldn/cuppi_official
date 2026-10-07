'use client';

import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useCollection } from '@/firebase';
import { collection, query, where, limit } from 'firebase/firestore';
import { useFirestore } from '@/firebase/provider';
import { Skeleton } from '@/components/ui/skeleton';
import { useMemo } from 'react';
import { Project } from "@/lib/projects";
import { getResizedImageUrl } from "@/lib/utils";

import { Button } from "../ui/button";

export function FeaturedWorkSection() {
  const firestore = useFirestore();

  const featuredProjectsQuery = useMemo(() => {
    if (!firestore) return null;
    return query(
      collection(firestore, 'projects'),
      where('featured', '==', true),
      limit(10)
    );
  }, [firestore]);

  const { data: featuredProjects, isLoading } = useCollection<Project>(featuredProjectsQuery);

  return (
    <section className="py-24 sm:py-32">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-headline text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            Featured Work
          </h2>
        </div>
        <div className="mx-auto mt-16 grid max-w-none grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-5">
          {isLoading &&
            Array.from({ length: 10 }).map((_, index) => (
              <div key={index} className="aspect-square">
                <Skeleton className="h-full w-full rounded-2xl" />
              </div>
            ))}
          {!isLoading && featuredProjects?.map((project) => (
            project.imageUrl && (
              <Link
                href={`/works/${project.slug}`}
                key={project.id}
                className="group relative block overflow-hidden rounded-2xl shadow-lg transition-all duration-300 ease-in-out hover:shadow-2xl hover:ring-4 hover:ring-accent"
              >
                <div className="aspect-square">
                  <Image
                    src={getResizedImageUrl(project.imageUrl, '600x600')}
                    alt={project.description || ''}
                    fill
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 20vw"
                    data-ai-hint="featured project"
                  />
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
              </Link>
            )
          ))}
        </div>
        <div className="mt-16 text-center">
          <Button asChild variant="link" className="text-lg text-primary">
            <Link href="/works">
              All works <ArrowRight className="ml-2 size-5" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
