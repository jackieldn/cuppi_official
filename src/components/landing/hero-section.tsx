'use client';
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/ui/reveal";
import { Fragment, useEffect, useRef, useState, type RefObject } from "react";
import { cn } from "@/lib/utils";
import { useFlip, useIsomorphicLayoutEffect } from "@/lib/use-flip";

const roles = [
  "motion gfx designer",
  "bread baker",
  "code tinkerer",
  "iOS app builder",
  "home renovator",
  "Fortnite player",
  "website builder",
];

// Each word is its own inline-block so it can glide to its new line (see useFlip).
function Words({ text }: { text: string }) {
  const words = text.split(" ");
  return (
    <>
      {words.map((word, i) => (
        <Fragment key={i}>
          <span data-flip="scale" className="inline-block">{word}</span>
          {i < words.length - 1 && " "}
        </Fragment>
      ))}
    </>
  );
}

// Ambient glow under the video: the video is sampled into a tiny canvas, replayed
// GLOW_DELAY_MS later, then blurred and stretched below the box so it lags behind
// the picture. The sampling canvases are only ever drawn to, never read back, so the
// cross-origin video doesn't taint anything.
const GLOW_DELAY_MS = 250;
const GLOW_TICK_MS = 50;
// How much of each new frame is blended in per tick. Lower is smoother and slower:
// 0.1 at 20 ticks a second settles in roughly a second.
const GLOW_SMOOTHING = 0.1;

function VideoGlow({ videoRef }: { videoRef: RefObject<HTMLVideoElement> }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!video || !canvas || !ctx) return;

    const W = 24;
    const H = 32;
    canvas.width = W;
    canvas.height = H;
    const frames = Math.round(GLOW_DELAY_MS / GLOW_TICK_MS) + 1;
    const ring = Array.from({ length: frames }, () => {
      const c = document.createElement("canvas");
      c.width = W;
      c.height = H;
      return c;
    });

    let next = 0;
    let captured = 0;
    let shown = false;
    const timer = setInterval(() => {
      if (video.readyState < 2) return;
      try {
        ring[next].getContext("2d")?.drawImage(video, 0, 0, W, H);
      } catch {
        return;
      }
      captured++;
      next = (next + 1) % frames;
      // `next` now points at the oldest captured frame, from GLOW_DELAY_MS ago
      // (until the ring has filled, show the very first one).
      // Blend into what's already showing rather than replacing it, so a sudden
      // dark-to-bright cut eases in over about a second instead of popping.
      ctx.globalAlpha = shown ? GLOW_SMOOTHING : 1;
      ctx.drawImage(ring[captured >= frames ? next : 0], 0, 0);
      ctx.globalAlpha = 1;
      shown = true;
      canvas.style.opacity = "0.9";
    }, GLOW_TICK_MS);

    return () => clearInterval(timer);
  }, [videoRef]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-4 top-[55%] h-[calc(45%+3.5rem)] w-[calc(100%-2rem)] opacity-0 blur-[36px] saturate-150 transition-opacity duration-1000"
    />
  );
}

export function HeroSection() {
  const videoUrl = "https://firebasestorage.googleapis.com/v0/b/studio-5700093446-89b93.firebasestorage.app/o/projects%2F1763125307049_JACK%20SHOWREEL%2023%20MEDIUM_1.mp4?alt=media&token=ddc8d3fb-4144-4d2a-b538-6405fdda9a15";
  
  const [currentRoleIndex, setCurrentRoleIndex] = useState(0);
  const [animationClass, setAnimationClass] = useState("animate-slide-in-up");
  const [expanded, setExpanded] = useState(false);
  // The text column's own layout (width, headline size). It follows `expanded` on the
  // way in, but on the way out waits a beat so it doesn't overrun the shrinking video.
  const [textNarrow, setTextNarrow] = useState(false);
  const textNarrowRef = useRef(false);
  const collapseTimer = useRef<ReturnType<typeof setTimeout>>();
  const textRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const { measure, play } = useFlip(textRef);

  // The text reflows in one step to its final width; this makes every word (and the
  // blocks under it) glide from its old spot to the new one.
  useIsomorphicLayoutEffect(() => {
    play();
  }, [textNarrow, play]);

  const setNarrow = (value: boolean) => {
    if (textNarrowRef.current === value) return;
    measure(); // positions before the reflow, read in the same frame as the change
    textNarrowRef.current = value;
    setTextNarrow(value);
  };

  const handleEnter = () => {
    clearTimeout(collapseTimer.current);
    setExpanded(true);
    setNarrow(true);
  };

  const handleLeave = () => {
    setExpanded(false);
    clearTimeout(collapseTimer.current);
    collapseTimer.current = setTimeout(() => setNarrow(false), 220);
  };

  useEffect(() => () => clearTimeout(collapseTimer.current), []);

  useEffect(() => {
    const interval = setInterval(() => {
      setAnimationClass("animate-slide-out-up");
      
      setTimeout(() => {
        setCurrentRoleIndex((prevIndex) => (prevIndex + 1) % roles.length);
        setAnimationClass("animate-slide-in-up");
      }, 200); // This should match the animation duration

    }, 1800); // Time between role changes

    return () => clearInterval(interval);
  }, []);

  return (
    <section className="flex min-h-screen items-center bg-background/70 py-24 sm:py-32 lg:overflow-x-clip">
      <div className="container mx-auto px-4">
        {/*
          Desktop only (lg+): hovering the video widens it to the right, pushing the
          text along, and swaps the text's "Watch Showreel" button for one on the video.
          Below lg nothing here changes, so phones and tablets keep the plain layout.
        */}
        <div className="flex flex-col items-center gap-12 lg:flex-row">
          {/* The slot is what widens. At rest it's the video (24rem) plus half the old spare space
              beside it, which halves the distance to the text (never wider than the old column). */}
          <Reveal
            stagger={140}
            className={cn(
              "w-full lg:shrink-0 lg:transition-[width] lg:duration-500 lg:ease-[cubic-bezier(0.33,1,0.68,1)]",
              expanded ? "lg:w-[min(48rem,62%)]" : "lg:w-[min(calc(40%-1.8rem),calc(24rem+max(0px,20%-14.4rem)))]"
            )}
          >
            <div
              onMouseEnter={handleEnter}
              onMouseLeave={handleLeave}
              className={cn(
                "relative mx-auto w-full max-w-sm",
                "lg:mx-0 lg:h-[32rem] lg:max-w-full lg:transition-[width] lg:duration-500 lg:ease-[cubic-bezier(0.33,1,0.68,1)]",
                expanded ? "lg:w-full" : "lg:w-[24rem]"
              )}
            >
              <VideoGlow videoRef={videoRef} />
              <div className="relative aspect-[3/4] w-full overflow-hidden rounded-2xl shadow-2xl lg:aspect-auto lg:h-full">
               <video
                  ref={videoRef}
                  // #t= is a media fragment: the first play starts 5s in (loops restart from 0).
                  src={`${videoUrl}#t=5`}
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="absolute h-full w-full object-cover"
                />
               <div
                 className={cn(
                   "pointer-events-none absolute inset-x-0 bottom-0 hidden h-1/3 bg-gradient-to-t from-black/55 to-transparent transition-opacity duration-500 lg:block",
                   expanded ? "opacity-100" : "opacity-0"
                 )}
               />
               <div
                 className={cn(
                   "absolute inset-x-0 bottom-8 hidden justify-center transition-opacity duration-300 lg:flex",
                   expanded ? "opacity-100 delay-300" : "pointer-events-none opacity-0"
                 )}
               >
                 <Button
                   asChild
                   size="lg"
                   variant="outline"
                   className="bg-background/60 backdrop-blur-md transition-transform hover:scale-105"
                 >
                   <Link href="#showreel" tabIndex={expanded ? 0 : -1}>Watch Showreel</Link>
                 </Button>
               </div>
              </div>
            </div>
          </Reveal>
          {/* Fixed widths (the space left beside the slot above), so the text reflows once. */}
          <div
            ref={textRef}
            className={cn(
              "min-w-0 text-center lg:flex-none lg:text-left",
              textNarrow ? "lg:w-[calc(100%-min(48rem,62%)-3rem)]" : "lg:w-[calc(100%-min(calc(40%-1.8rem),calc(24rem+max(0px,20%-14.4rem)))-3rem)]"
            )}
          >
            <Reveal stagger={140}>
            <h1
              className={cn(
                "font-headline text-4xl font-bold tracking-tight text-foreground sm:text-5xl",
                textNarrow && "lg:text-4xl"
              )}
            >
              <Words text="Hello, I'm Jack, a senior" />
              <span data-flip="move" className="block relative h-16">
                <span className={cn(
                  "absolute inset-0",
                  animationClass
                )}>
                  {roles[currentRoleIndex]}
                </span>
              </span>
            </h1>
            </Reveal>
            <Reveal stagger={140}>
            <p className="mt-6 text-lg leading-8 text-foreground/80 md:text-xl">
              <Words text="with a huge amount of curiosity and motivation to create functional and pretty things." />
            </p>
            </Reveal>
            <Reveal stagger={140}>
            <div data-flip="move" className="mt-10 flex items-center justify-center gap-x-6 lg:justify-start">
              <Button
                asChild
                size="lg"
                className="bg-accent text-accent-foreground transition-transform hover:scale-105 hover:bg-accent/90"
              >
                <Link href="/works">View portfolio</Link>
              </Button>
              {/* Fades out while the video is expanded, as the video shows its own. */}
              <Button
                asChild
                size="lg"
                variant="outline"
                className={cn(
                  "transition-[transform,opacity] duration-300 hover:scale-105",
                  expanded && "lg:pointer-events-none lg:opacity-0"
                )}
              >
                <Link href="#showreel" tabIndex={expanded ? -1 : 0}>Watch Showreel</Link>
              </Button>
            </div>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}
