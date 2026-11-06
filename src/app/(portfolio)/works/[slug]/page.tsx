'use client';
import { sanitizeHtml } from '@/lib/sanitize-html';
import { notFound, useParams, useRouter } from "next/navigation";
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
import { useEffect, useMemo, useRef, useState } from 'react';
import { clearFlight, landFlight, startReturnFlight, useFlight } from '@/lib/card-flight';
import { hideBand, showBand } from '@/lib/title-band';
import { CoverGlow, CoverSweeps } from '@/components/works/cover-glow';
import { useFetchCollection } from '@/firebase';
import { collection, orderBy, query, where } from 'firebase/firestore';
import type { Testimonial } from '@/lib/about-types';
import { TestimonialItem } from '@/components/about/testimonials-section';
import { useFirestore } from '@/firebase/provider';
import { useDesktop } from '@/components/desktop/desktop-context';
import { Reveal } from "@/components/ui/reveal";
import { Project } from "@/lib/projects";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { NoAiIcon } from "@/components/icons/no-ai-icon";
import { cn, getResizedImageUrl } from "@/lib/utils";
import { SHINE_STYLE, TILT_TRANSFORM, useCursorTilt } from "@/lib/use-cursor-tilt";

// Tags and gallery outlines cycle through the portfolio palette.
const TAG_COLOURS = [
  "bg-palette-ocean text-palette-cream hover:bg-palette-ocean/80",
  "bg-palette-lagoon text-palette-ink hover:bg-palette-lagoon/80",
  "bg-palette-sage text-palette-ink hover:bg-palette-sage/80",
];
const GALLERY_RINGS = [
  "hover:ring-accent",
  "hover:ring-palette-lagoon",
  "hover:ring-palette-cream",
  "hover:ring-palette-ocean",
];

export default function ProjectPage() {
  const firestore = useFirestore();
  const desktop = useDesktop();
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [password, setPassword] = useState('');
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());
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

  // Only fetch the testimonials pool when this project picked some.
  const hasTestimonials = (project?.testimonialIds?.length ?? 0) > 0;
  const testimonialsQuery = useMemo(() => {
    if (!firestore || !hasTestimonials) return null;
    return query(collection(firestore, 'testimonials'), orderBy('order'));
  }, [firestore, hasTestimonials]);
  const { data: testimonialPool } = useFetchCollection<Testimonial>(testimonialsQuery);
  // In the order the admin picked them; ones that were since deleted just drop out.
  const projectTestimonials = useMemo(() => {
    const pool = testimonialPool ?? [];
    return (project?.testimonialIds ?? [])
      .map((id) => pool.find((t) => t.id === id))
      .filter((t): t is Testimonial => Boolean(t));
  }, [testimonialPool, project]);

  // Coming from a works card: its copy is waiting to fly onto this cover. Hold the
  // real cover back until it has landed, then let the flight glide in.
  const coverRef = useRef<HTMLDivElement>(null);
  // Same cursor tilt and shine as the cards on the works page.
  const { tiltRef, onPointerMove: handleCoverPointerMove, onPointerLeave: handleCoverPointerLeave } =
    useCursorTilt<HTMLDivElement>(coverRef);
  const flight = useFlight();
  const awaitingFlight = flight?.slug === slug;
  // Arrived by flight: the cover is handed over by the flying copy. Otherwise (direct
  // visit, reload) the cover fades up with everything else.
  const cameFromFlight = useRef(awaitingFlight).current;

  // The lighter band behind the title and details is drawn by a layer in the layout
  // (see src/lib/title-band.ts) so it can fade over 1s in and out across page changes.
  // This page only reports how tall the top section is.
  const router = useRouter();
  const [leaving, setLeaving] = useState(false);
  const topSectionRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = topSectionRef.current;
    if (isLoading || !project || !el) return;
    const report = () => showBand(el.getBoundingClientRect().bottom + window.scrollY);
    report();
    const observer = new ResizeObserver(report);
    observer.observe(el);
    return () => {
      observer.disconnect();
      hideBand();
    };
  }, [isLoading, project, isUnlocked]);

  // Once the cover is in place, an ambient glow (a blurred copy of the picture) fades
  // in behind it. Wait for the picture itself, and for any flight to have landed.
  const [glowSrc, setGlowSrc] = useState<string | null>(null);
  const [glowRun, setGlowRun] = useState(false);
  useEffect(() => {
    const img = coverRef.current?.querySelector('img');
    if (isLoading || !project || !img) return;
    const take = () => setGlowSrc(img.currentSrc || img.src);
    if (img.complete && img.naturalWidth > 0) take();
    else img.addEventListener('load', take, { once: true });
    return () => img.removeEventListener('load', take);
  }, [isLoading, project, isUnlocked]);
  useEffect(() => {
    if (!glowSrc || awaitingFlight || glowRun) return;
    // After a flight the cover is already there; on a direct visit it's still fading up.
    const timer = setTimeout(() => setGlowRun(true), cameFromFlight ? 150 : 700);
    return () => clearTimeout(timer);
  }, [glowSrc, awaitingFlight, glowRun, cameFromFlight]);

  useEffect(() => {
    if (!flight || flight.direction !== 'forward' || flight.slug !== slug || flight.phase !== 'held' || isLoading) return;
    const cover = coverRef.current;
    if (!cover) {
      // Locked, missing or no artwork: there's nothing to land on.
      clearFlight();
      return;
    }
    let landed = false;
    const land = () => {
      if (landed) return;
      landed = true;
      landFlight(slug, () => coverRef.current);
    };
    // Wait for the cover picture so the hand-over doesn't flash an empty frame.
    const img = cover.querySelector('img');
    if (!img || (img.complete && img.naturalWidth > 0)) {
      land();
      return;
    }
    img.addEventListener('load', land);
    img.addEventListener('error', land);
    const timer = setTimeout(land, 3000);
    return () => {
      img.removeEventListener('load', land);
      img.removeEventListener('error', land);
      clearTimeout(timer);
    };
  }, [flight, slug, isLoading, project, isUnlocked]);

  // Browser back (or forward) out of this page: send the cover back to its card.
  useEffect(() => {
    // Capture phase: Next's own popstate handler swaps the page synchronously, and
    // the cover has to be measured before that happens.
    const onPopState = () => startReturnFlight(slug);
    window.addEventListener('popstate', onPopState, { capture: true });
    return () => window.removeEventListener('popstate', onPopState, { capture: true });
  }, [slug]);

  const handlePasswordSubmit =(e: React.FormEvent) => {
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
  
  // No placeholder boxes while loading: the page is blank, then the content fades up.
  if (isLoading) {
    return <div className="min-h-screen" />;
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

  // Skip entries whose file no longer exists so they don't render as broken boxes.
  const galleryImageObjects = galleryImages
    .map((url, i) => ({
      id: `${project.id}-gallery-${i}`,
      imageUrl: url,
      description: project.title,
      imageHint: "project gallery"
    }))
    .filter((image) => !failedImages.has(image.imageUrl))

  const deliveryDate = [project.deliveryMonth, project.deliveryYear].filter(Boolean).join(", ");

  return (
    <div className="relative flex flex-col">
      {/* Zero-height sticky rail: the button stays in the top-left corner while the page
          scrolls, without taking up any space in the layout. */}
      <div
        className={cn(
          "pointer-events-none sticky z-10 h-0",
          // Full screen on a desktop: the traffic lights float in the top-left corner (and grow
          // under the cursor), so the back button sits underneath them.
          desktop.available && desktop.mode === 'full' ? "top-24" : "top-8",
        )}
      >
       <Button
        asChild
        variant="outline"
        className="pointer-events-auto absolute left-8 top-0 h-12 w-12 rounded-full"
        aria-label="Back to works"
      >
        <Link
          href="/works"
          onClick={(e) => {
            if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
            if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
            // Fade the page (and its lighter band) out first, with the cover already on its
            // way back, then navigate.
            e.preventDefault();
            startReturnFlight(slug);
            hideBand();
            setLeaving(true);
            setTimeout(() => router.push('/works'), 450);
          }}
        >
          <ChevronLeft className="h-6 w-6" />
        </Link>
      </Button>
      </div>
      <main className="flex-1 transition-opacity duration-300 ease-out" style={{ opacity: leaving ? 0 : 1 }}>
        {/* Section 1: Project Info */}
        <section ref={topSectionRef} className="py-24 sm:py-32">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 items-start gap-12 lg:grid-cols-2">
              {project.imageUrl && (
                // One fixed size at every breakpoint: 20% under the old 28rem (max-w-md).
                <div
                  ref={coverRef}
                  data-flight-cover=""
                  className={cn(
                    "relative aspect-square w-full max-w-[22.4rem] mx-auto lg:mr-0 lg:ml-auto",
                    !cameFromFlight && "opacity-0 animate-[fade-in-up_0.6s_ease-out_forwards] motion-reduce:animate-none motion-reduce:opacity-100",
                    // important, so it also hides the cover while its animation fill holds it visible
                    awaitingFlight && "!opacity-0"
                  )}
                >
                  {glowRun && glowSrc && <CoverGlow src={glowSrc} />}
                  {/* Same cursor tilt and shine as the cards on the works page. The wrapper
                      above doesn't tilt, so the flight still measures the true cover box. */}
                  <div
                    ref={tiltRef}
                    onPointerMove={handleCoverPointerMove}
                    onPointerLeave={handleCoverPointerLeave}
                    className="absolute inset-0"
                    style={{
                      transform: TILT_TRANSFORM,
                      transition: "transform 220ms ease-out",
                    }}
                  >
                    {/* The picture and shine are clipped to the rounded corners; the glow isn't. */}
                    <div className="absolute inset-0 overflow-hidden rounded-2xl">
                    <Image
                      src={getResizedImageUrl(project.imageUrl, '800x800')}
                      alt={project.description || ''}
                      fill
                      priority
                      className="object-cover rounded-2xl"
                      // Rests at scale 1 (the flight hands over to it unzoomed); while hovered it
                      // zooms a touch and counter-moves against the tilt so it sits behind the card.
                      style={{
                        transform: "scale(calc(1 + var(--lift, 0) * 0.04)) translate(calc(var(--px, 0) * -6px), calc(var(--py, 0) * -6px))",
                        transition: "transform 220ms ease-out",
                      }}
                      data-ai-hint="project cover"
                    />
                    {/* Shine: a soft highlight that tracks the cursor, strongest while hovered. */}
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-0"
                      style={SHINE_STYLE}
                    />
                    </div>
                    {/* The stronger highlights sweep along the picture's bottom edge: glowing on it
                        and spilling out below, tilting with it. */}
                    {glowRun && glowSrc && <CoverSweeps src={glowSrc} />}
                  </div>
                </div>
              )}
              <div className="space-y-6">
                 <Reveal hold={awaitingFlight} stagger={140} className="flex items-center gap-4">
                  <h1 className="font-headline text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
                    {project.title}
                  </h1>
                </Reveal>
                {project.overview && (
                  <Reveal hold={awaitingFlight} stagger={140}>
                    <div
                      className="text-lg leading-8 text-foreground/80"
                      dangerouslySetInnerHTML={{ __html: sanitizeHtml(project.overview) }}
                    />
                  </Reveal>
                )}
                <Reveal hold={awaitingFlight} stagger={140} className="space-y-4 text-foreground/80">
                  <p><strong className="text-palette-lagoon">Client:</strong> {project.client}</p>
                  <p><strong className="text-palette-lagoon">Timeframe:</strong> {project.timeframe}</p>
                  <p><strong className="text-palette-lagoon">Software:</strong> {project.software?.join(", ")}</p>
                  {deliveryDate && <p><strong className="text-palette-lagoon">Delivered:</strong> {deliveryDate}</p>}
                  {project.noAi && (
                    <p className="flex items-center gap-2">
                      <NoAiIcon className="h-6 w-6" />
                      <strong>This project was built without using Generative AI.</strong>
                    </p>
                  )}
                  {project.aiDisclaimer && <p><strong className="text-palette-lagoon">AI Disclaimer:</strong> {project.aiDisclaimer}</p>}
                </Reveal>
                <Reveal hold={awaitingFlight} stagger={140} className="flex flex-wrap gap-2">
                  {project.tags?.map((tag: string, i: number) => (
                    <Badge key={tag} variant="secondary" className={TAG_COLOURS[i % TAG_COLOURS.length]}>{tag}</Badge>
                  ))}
                </Reveal>
              </div>
            </div>
          </div>
        </section>

        {/* Section 2: Testimonials (optional, picked per project) */}
        {projectTestimonials.length > 0 && (
          // No heading: the boxes speak for themselves. The top padding keeps them clear of the
          // lighter band behind the title and details above.
          <section className="pb-8 pt-14 sm:pb-12 sm:pt-20">
            <div className="container mx-auto px-4">
              <div className={cn("mx-auto grid grid-cols-1 gap-8", projectTestimonials.length === 1 ? "max-w-3xl" : "max-w-6xl md:grid-cols-2")}>
                {projectTestimonials.map((testimonial) => (
                  <TestimonialItem key={testimonial.id} testimonial={testimonial} />
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Section 3: Gallery */}
        {galleryImageObjects.length > 0 && (
          <section className="py-24 sm:py-32">
            <div className="container mx-auto px-4">
              <Reveal hold={awaitingFlight}>
                <h2 className="text-center font-headline text-3xl font-bold text-palette-sage sm:text-4xl mb-16">
                  Gallery
                </h2>
              </Reveal>
              <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
                {galleryImageObjects.map((image, i) => (
                  image.imageUrl && (
                    <Reveal key={image.id} hold={awaitingFlight} stagger={90}>
                    <Dialog>
                      <DialogTrigger asChild>
                        <div className={`group relative block cursor-pointer overflow-hidden rounded-2xl shadow-lg transition-all duration-300 ease-in-out hover:-translate-y-1 hover:shadow-2xl hover:ring-4 ${GALLERY_RINGS[i % GALLERY_RINGS.length]}`}>
                          <div className="aspect-video">
                            <Image
                              src={getResizedImageUrl(image.imageUrl, '600x338')}
                              alt={image.description || ''}
                              fill
                              className="object-cover transition-transform duration-300 group-hover:scale-105"
                              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                              onError={() => setFailedImages((prev) => new Set(prev).add(image.imageUrl))}
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
                    </Reveal>
                  )
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Section 4: Videos */}
        {videoUrls.length > 0 && (
          <section className="py-24 sm:py-32">
            <div className="container mx-auto px-4">
              <Reveal hold={awaitingFlight}>
                <h2 className="text-center font-headline text-3xl font-bold text-palette-sage sm:text-4xl mb-16">
                  Final Product
                </h2>
              </Reveal>
              {/* A lone video stays large and centred; two or more go two per row. */}
              <div className={`grid grid-cols-1 gap-8 mx-auto ${videoUrls.length === 1 ? 'max-w-5xl' : 'md:grid-cols-2 max-w-6xl'}`}>
                {videoUrls.map((videoUrl, index) => {
                  const isYoutube = videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be');
                  return (
                    <Reveal key={index} hold={awaitingFlight} stagger={120}>
                    <div
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
                    </Reveal>
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
