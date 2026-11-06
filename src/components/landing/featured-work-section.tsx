'use client';

import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useCollection } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import { useFirestore } from '@/firebase/provider';
import { useMemo } from 'react';
import { Project } from "@/lib/projects";
import { getResizedImageUrl } from "@/lib/utils";
import { CARD_IMG_SCALE } from "@/lib/card-flight";
import { SHINE_STYLE, TILT_TRANSFORM, useCursorTilt } from "@/lib/use-cursor-tilt";

import { Button } from "../ui/button";
import { Reveal } from "../ui/reveal";

// The works-page card: tilts toward the cursor, with a shine and the picture sitting
// a little behind. The grid item (Reveal) and the wrapper don't tilt; only the link does.
function FeaturedCard({ project }: { project: Project }) {
  const { wrapperRef, tiltRef, onPointerMove, onPointerLeave } = useCursorTilt<HTMLAnchorElement>();

  return (
    <Reveal stagger={90}>
      <div ref={wrapperRef}>
        <Link
          ref={tiltRef}
          href={`/works/${project.slug}`}
          onPointerMove={onPointerMove}
          onPointerLeave={onPointerLeave}
          className="group relative block overflow-hidden rounded-2xl shadow-lg transition-shadow duration-300 hover:shadow-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          style={{ transform: TILT_TRANSFORM, transition: "transform 220ms ease-out, box-shadow 300ms ease-out" }}
        >
          <div className="aspect-square">
            <Image
              src={getResizedImageUrl(project.imageUrl!, '600x600')}
              alt={project.description || ''}
              fill
              className="object-cover"
              // Counter-moves against the tilt so the picture sits a little behind the card.
              style={{
                transform: `scale(${CARD_IMG_SCALE}) translate(calc(var(--px, 0) * -6px), calc(var(--py, 0) * -6px))`,
                transition: "transform 220ms ease-out",
              }}
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 20vw"
              data-ai-hint="featured project"
            />
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
          <div aria-hidden="true" className="pointer-events-none absolute inset-0" style={SHINE_STYLE} />
        </Link>
      </div>
    </Reveal>
  );
}

export function FeaturedWorkSection() {
  const firestore = useFirestore();

  const featuredProjectsQuery = useMemo(() => {
    if (!firestore) return null;
    return query(
      collection(firestore, 'projects'),
      where('featured', '==', true)
    );
  }, [firestore]);

  const { data: featuredProjects, isLoading } = useCollection<Project>(featuredProjectsQuery);

  return (
    <section className="py-24 sm:py-32">
      <div className="container mx-auto px-4">
        <Reveal className="mx-auto max-w-2xl text-center">
          <h2 className="font-headline text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            Featured Work
          </h2>
        </Reveal>
        {/* No placeholder boxes while loading: the cards fade up as they arrive. */}
        <div className="mx-auto mt-16 grid max-w-none grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-5">
          {!isLoading && featuredProjects?.map((project) => (
            project.imageUrl && <FeaturedCard key={project.id} project={project} />
          ))}
        </div>
        <Reveal className="mt-16 text-center">
          <Button asChild variant="link" className="text-lg text-primary">
            <Link href="/works">
              All works <ArrowRight className="ml-2 size-5" />
            </Link>
          </Button>
        </Reveal>
      </div>
    </section>
  );
}
