'use client';

import Image from "next/image";
import Link from "next/link";
import { Skeleton } from '@/components/ui/skeleton';
import { useEffect, useState, useMemo } from "react";
import { App } from "@/lib/about-types";
import { Badge } from "@/components/ui/badge";
import { getResizedImageUrl } from "@/lib/utils";

interface AppGalleryProps {
  initialApps: App[];
}

export function AppGallery({ initialApps }: AppGalleryProps) {
  const [isClient, setIsClient] = useState(false);
  const [apps, setApps] = useState(initialApps);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const showSkeletons = !isClient;

  return (
    <section className="py-24 sm:py-32">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-3xl">
          <h1 className="font-headline text-5xl font-bold tracking-tight text-accent sm:text-6xl">
            Apps & Websites
          </h1>
          <div className="mt-8 space-y-6 text-lg leading-8 text-foreground/80">
            <p>
              Here are some of the applications and websites I've built. Some are personal projects, others were for clients.
            </p>
          </div>
        </div>

        <div className="mx-auto mt-16 grid grid-cols-1 gap-y-16 gap-x-8 lg:mx-0 lg:max-w-none lg:grid-cols-3">
          {showSkeletons &&
            Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="flex flex-col space-y-4">
                 <Skeleton className="aspect-[16/9] w-full rounded-2xl" />
                 <Skeleton className="h-6 w-3/4" />
                 <Skeleton className="h-4 w-1/2" />
                 <Skeleton className="h-10 w-full" />
              </div>
            ))}

          {!showSkeletons && apps?.map((app) => (
            <Link key={app.id} href={`/apps/${app.slug}`} className="group flex flex-col items-start justify-between rounded-2xl bg-card border shadow-sm p-6 hover:shadow-lg transition-shadow">
                <div className="relative w-full">
                  <div className="relative aspect-[16/9] w-full overflow-hidden rounded-2xl ring-1 ring-gray-900/10">
                    {app.coverImage && (
                        <Image
                            src={getResizedImageUrl(app.coverImage.url, "800x450")}
                            alt={app.title}
                            fill
                            className="object-cover"
                        />
                    )}
                  </div>
                  <div className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-gray-900/10" />
                </div>
                <div className="max-w-xl mt-6">
                    <div className="flex items-center gap-x-4 text-xs">
                        <time dateTime={app.releaseDate} className="text-muted-foreground">
                            {new Date(app.releaseDate).getFullYear()}
                        </time>
                        <Badge variant="secondary">{app.availability}</Badge>
                    </div>
                    <div className="relative">
                        <h3 className="mt-3 text-lg font-semibold leading-6 text-foreground group-hover:text-primary">
                            {app.title}
                        </h3>
                        <p className="mt-5 line-clamp-3 text-sm leading-6 text-muted-foreground">{app.description}</p>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                        {app.platforms?.map((platform) => (
                            <Badge key={platform} variant="outline">{platform}</Badge>
                        ))}
                    </div>
                </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
