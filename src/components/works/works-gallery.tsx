'use client';

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useMemo, type CSSProperties } from "react";
import { Project } from "@/lib/projects";
import { Button } from "@/components/ui/button";
import { cn, getResizedImageUrl } from "@/lib/utils";
import { Lock } from "lucide-react";
import { CARD_IMG_SCALE, landFlight, startFlight, useFlight } from "@/lib/card-flight";
import { useFlip, useIsomorphicLayoutEffect } from "@/lib/use-flip";

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

  // Changing the sort or filter reorders the cards; they glide to their new places
  // instead of jumping (see useFlip). Positions are read just before the change.
  const gridRef = useRef<HTMLDivElement>(null);
  const { measure, play } = useFlip(gridRef);
  useIsomorphicLayoutEffect(() => {
    play();
  }, [sortOrder, selectedTag, play]);
  const changeSort = (order: SortOrder) => {
    if (order === sortOrder) return;
    measure();
    setSortOrder(order);
  };
  const changeTag = (tag: string) => {
    if (tag === selectedTag) return;
    measure();
    setSelectedTag(tag);
  };

  // The active sort button is highlighted by a pill that slides between the two.
  const sortBoxRef = useRef<HTMLDivElement>(null);
  const sortButtonRefs = useRef<Record<SortOrder, HTMLButtonElement | null>>({ newest: null, oldest: null });
  const [pill, setPill] = useState<{ left: number; width: number } | null>(null);
  const [pillReady, setPillReady] = useState(false);
  useIsomorphicLayoutEffect(() => {
    const box = sortBoxRef.current;
    if (!box) return;
    const place = () => {
      const active = sortButtonRefs.current[sortOrder];
      if (active) setPill({ left: active.offsetLeft, width: active.offsetWidth });
    };
    place();
    // Fonts loading or the window resizing change the buttons' widths.
    const observer = new ResizeObserver(place);
    observer.observe(box);
    return () => observer.disconnect();
  }, [sortOrder]);
  // Slide only after the first placement, so the pill doesn't fly in from the corner.
  useEffect(() => {
    if (pill) setPillReady(true);
  }, [pill]);

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

  // No placeholder boxes: until the data is in, the grid is simply empty, and the cards
  // then fade up on their own.
  const notReady = isLoading || !isClient;

  // Clicking a card sends its cover flying to the project page; everything else on the
  // page fades out, header first, then the cards rippling outward from the clicked one.
  const flight = useFlight();
  const leaving = flight?.direction === 'forward';
  const leaveStyle = (delayMs: number): CSSProperties => ({
    opacity: leaving ? 0 : 1,
    transition: `opacity ${LEAVE_FADE_MS}ms ease-out ${leaving ? delayMs : 0}ms`,
    pointerEvents: leaving ? 'none' : undefined,
  });

  return (
    <section className="py-24 sm:py-32">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-3xl" style={leaveStyle(0)}>
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

        <div className="flex justify-center items-center flex-wrap gap-4 mt-16" style={leaveStyle(60)}>
            <div className="flex flex-wrap justify-center gap-2">
              {filterTags.map((tag) => (
                <Button
                  key={tag}
                  variant={selectedTag === tag ? "default" : "outline"}
                  onClick={() => changeTag(tag)}
                  className={cn("rounded-full transition-all", {
                    "bg-primary text-primary-foreground": selectedTag === tag,
                  })}
                >
                  {tag}
                </Button>
              ))}
            </div>
            <div ref={sortBoxRef} className="relative flex items-center gap-2 rounded-full border p-1">
                <div
                  aria-hidden="true"
                  className={cn("pointer-events-none absolute bottom-1 top-1 rounded-full bg-accent", pill ? "opacity-100" : "opacity-0")}
                  style={{
                    left: pill?.left ?? 0,
                    width: pill?.width ?? 0,
                    transition: pillReady ? "left 450ms cubic-bezier(0.33, 1, 0.68, 1), width 450ms cubic-bezier(0.33, 1, 0.68, 1)" : "none",
                  }}
                />
                {(["newest", "oldest"] as const).map((order) => (
                  <Button
                    key={order}
                    ref={(el) => { sortButtonRefs.current[order] = el; }}
                    variant="ghost"
                    size="sm"
                    onClick={() => changeSort(order)}
                    className={cn(
                      "relative z-10 rounded-full bg-transparent transition-colors hover:bg-transparent",
                      sortOrder === order ? "text-accent-foreground" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {order === "newest" ? "Newest First" : "Oldest First"}
                  </Button>
                ))}
            </div>
        </div>

        <div ref={gridRef} className="mx-auto mt-12 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {!notReady && filteredAndSortedProjects.map((project, index) => (
            <WorkCard key={project.id} project={project} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
}

// How far (degrees) a card tips toward the cursor's side. The side under the cursor
// presses back, the opposite side comes forward.
const TILT_DEG = 9;

// Clicking a card: the rest of the page fades out first (header, then the cards
// rippling outward), and only then do we navigate, so the fade is actually seen.
const LEAVE_FADE_MS = 280;
const LEAVE_NAV_DELAY_MS = 520;

// Fades up once its own image has loaded; the delay is staggered by position so
// covers arrive one after another. Capped so a long list doesn't crawl.
function WorkCard({ project, index }: { project: Project; index: number }) {
  const [revealed, setRevealed] = useState(false);
  // True once a cover has flown back to this card: it then appears in place, no fade-up.
  const [skipFade, setSkipFade] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const linkRef = useRef<HTMLAnchorElement>(null);
  const flight = useFlight();
  const router = useRouter();
  // While this card's copy is flying off to the project page, the real one steps aside.
  const isFlying = flight?.slug === project.slug;
  // Another card was clicked: fade out, later the further we are from it. (Reads the
  // DOM during render, which is fine here: it only picks a transition delay.)
  const leaving = flight?.direction === 'forward' && !isFlying;
  let leaveDelay = 0;
  if (leaving && flight && cardRef.current) {
    const r = cardRef.current.getBoundingClientRect();
    const dx = r.left + r.width / 2 - (flight.rect.left + flight.rect.width / 2);
    const dy = r.top + r.height / 2 - (flight.rect.top + flight.rect.height / 2);
    leaveDelay = Math.min(220, 40 + Math.hypot(dx, dy) * 0.15);
  }
  const isLocked = project.privacy?.isPasswordProtected;
  const displayImageUrl = (isLocked && project.blurredImageUrl) ? project.blurredImageUrl : project.imageUrl;

  // Native load/error events rather than next/image's onLoad, which only runs
  // after an async decode step. A dead image still reveals, so no invisible card.
  useEffect(() => {
    const img = cardRef.current?.querySelector('img');
    if (!img) return;
    if (img.complete) {
      setRevealed(true);
      return;
    }
    const reveal = () => setRevealed(true);
    img.addEventListener('load', reveal);
    img.addEventListener('error', reveal);
    return () => {
      img.removeEventListener('load', reveal);
      img.removeEventListener('error', reveal);
    };
  }, [displayImageUrl]);

  // The project page is handing its cover back to this card: scroll the card into
  // view if needed, then tell the layer where to land (see src/lib/card-flight.ts).
  useEffect(() => {
    if (!flight || flight.direction !== 'back' || flight.slug !== project.slug) return;
    setSkipFade(true);
    if (flight.phase !== 'held') return;
    const wrapper = cardRef.current;
    if (!wrapper) return;
    let landed = false;
    let settleTimer: ReturnType<typeof setInterval> | undefined;
    const land = () => {
      if (landed) return;
      landed = true;
      clearInterval(settleTimer);
      const r = wrapper.getBoundingClientRect();
      if (r.top < 80 || r.bottom > window.innerHeight - 100) {
        window.scrollTo({ top: window.scrollY + r.top - (window.innerHeight - r.height) / 2, behavior: 'instant' });
      }
      landFlight(project.slug, () => cardRef.current);
    };
    // The grid can still be re-ordering as data arrives, which moves the card. Only
    // land once it has stood still for a moment (or after a cap, so it never hangs).
    const landWhenSettled = () => {
      if (landed || settleTimer) return;
      const began = performance.now();
      let last = wrapper.getBoundingClientRect();
      let stillSince = began;
      settleTimer = setInterval(() => {
        const now = performance.now();
        const r = wrapper.getBoundingClientRect();
        if (Math.abs(r.left - last.left) > 1 || Math.abs(r.top - last.top) > 1) {
          last = r;
          stillSince = now;
        }
        if (now - stillSince >= 250 || now - began >= 1500) land();
      }, 50);
    };
    const img = wrapper.querySelector('img');
    if (!img || (img.complete && img.naturalWidth > 0)) {
      landWhenSettled();
      return () => clearInterval(settleTimer);
    }
    img.addEventListener('load', landWhenSettled);
    img.addEventListener('error', landWhenSettled);
    const timer = setTimeout(landWhenSettled, 3000);
    return () => {
      img.removeEventListener('load', landWhenSettled);
      img.removeEventListener('error', landWhenSettled);
      clearTimeout(timer);
      clearInterval(settleTimer);
    };
  }, [flight, project.slug]);

  // Tilt and shine follow the cursor through CSS variables set straight on the
  // element (no React state, so moving the mouse doesn't re-render anything).
  // Measured on the wrapper, which doesn't tilt, so the maths can't feed back on itself.
  const handlePointerMove = (e: React.PointerEvent) => {
    if (e.pointerType !== 'mouse') return;
    const wrapper = cardRef.current;
    const link = linkRef.current;
    if (!wrapper || !link) return;
    const r = wrapper.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * 2 - 1;
    const y = ((e.clientY - r.top) / r.height) * 2 - 1;
    link.style.setProperty('--rx', `${-y * TILT_DEG}deg`);
    link.style.setProperty('--ry', `${x * TILT_DEG}deg`);
    link.style.setProperty('--px', String(x));
    link.style.setProperty('--py', String(y));
    link.style.setProperty('--mx', `${(x + 1) * 50}%`);
    link.style.setProperty('--my', `${(y + 1) * 50}%`);
    link.style.setProperty('--lift', '1');
  };

  const handlePointerLeave = () => {
    const link = linkRef.current;
    if (!link) return;
    ['--rx', '--ry'].forEach((v) => link.style.setProperty(v, '0deg'));
    ['--px', '--py', '--lift'].forEach((v) => link.style.setProperty(v, '0'));
  };

  // Plain clicks only: the cover art flies to the project page. Ctrl/Cmd-click and
  // friends open the page normally, as does reduced motion.
  const handleClick = (e: React.MouseEvent) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const wrapper = cardRef.current;
    const img = wrapper?.querySelector('img');
    if (!wrapper || !img?.currentSrc) return;
    const r = wrapper.getBoundingClientRect();
    startFlight({
      slug: project.slug,
      src: img.currentSrc,
      rect: { left: r.left, top: r.top, width: r.width, height: r.height },
      radius: 16, // rounded-2xl
      // The card's picture is zoomed a little; the cover's is not. Start where the
      // card is (read live, as the cursor may have nudged it) and settle at 1.
      imgScaleFrom: new DOMMatrix(getComputedStyle(img).transform).a || CARD_IMG_SCALE,
      imgScaleTo: 1,
    });
    // Hold the navigation while everything else fades out.
    e.preventDefault();
    setTimeout(() => router.push(`/works/${project.slug}`), LEAVE_NAV_DELAY_MS);
  };

  if (!displayImageUrl) return null;

  return (
    <div
      ref={cardRef}
      data-flip="move"
      className={cn(
        skipFade ? "opacity-100" : "opacity-0 motion-reduce:opacity-100",
        !skipFade && revealed && "animate-[fade-in-up_0.6s_ease-out_forwards] motion-reduce:animate-none",
        isFlying && "invisible",
        leaving && "pointer-events-none"
      )}
      style={{ animationDelay: `${Math.min(index, 11) * 80}ms` }}
    >
      <Link
        ref={linkRef}
        href={`/works/${project.slug}`}
        onClick={handleClick}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        className="group relative block overflow-hidden rounded-2xl shadow-lg transition-shadow duration-300 hover:shadow-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        style={{
          transform: "perspective(900px) rotateX(var(--rx, 0deg)) rotateY(var(--ry, 0deg)) scale(calc(1 + var(--lift, 0) * 0.025))",
          opacity: leaving ? 0 : 1,
          transition: `transform 220ms ease-out, box-shadow 300ms ease-out, opacity ${LEAVE_FADE_MS}ms ease-out ${leaving ? leaveDelay : 0}ms`,
        }}
      >
        <div className="aspect-square">
          <Image
            src={getResizedImageUrl(displayImageUrl, '600x600')}
            alt={project.description || ''}
            fill
            className="object-cover"
            // Counter-moves against the tilt so the picture sits a little behind the card.
            style={{
              transform: `scale(${CARD_IMG_SCALE}) translate(calc(var(--px, 0) * -6px), calc(var(--py, 0) * -6px))`,
              transition: "transform 220ms ease-out",
            }}
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
            data-ai-hint="project cover"
          />
        </div>
        {/* Shine: a soft highlight that tracks the cursor, strongest while hovered. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            background: "radial-gradient(circle at var(--mx, 50%) var(--my, 50%), rgba(255,255,255,0.55), rgba(255,255,255,0) 60%)",
            mixBlendMode: "overlay",
            opacity: "var(--lift, 0)",
            transition: "opacity 300ms ease-out",
          }}
        />
        {isLocked && (
          <div className="absolute top-3 right-3 flex h-8 w-8 items-center justify-center rounded-full bg-background/80 backdrop-blur-sm">
            <Lock className="h-4 w-4 text-foreground" />
          </div>
        )}
      </Link>
    </div>
  );
}
