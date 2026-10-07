'use client';
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const roles = [
  "motion gfx designer",
  "bread baker",
  "code tinkerer",
  "iOS app builder",
  "home renovator",
  "Fortnite player",
  "website builder",
];

export function HeroSection() {
  const videoUrl = "https://firebasestorage.googleapis.com/v0/b/studio-5700093446-89b93.firebasestorage.app/o/projects%2F1763125307049_JACK%20SHOWREEL%2023%20MEDIUM_1.mp4?alt=media&token=ddc8d3fb-4144-4d2a-b538-6405fdda9a15";
  
  const [currentRoleIndex, setCurrentRoleIndex] = useState(0);
  const [animationClass, setAnimationClass] = useState("animate-slide-in-up");

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
    <section className="flex min-h-screen items-center bg-background/70 py-24 sm:py-32">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <div className="relative mx-auto aspect-[3/4] w-full max-w-sm overflow-hidden rounded-2xl shadow-2xl">
               <video
                  src={videoUrl}
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="absolute h-full w-full object-cover"
                />
            </div>
          </div>
          <div className="text-center lg:col-span-3 lg:text-left">
            <h1 className="font-headline text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
              Hello, I'm Jack, a senior
              <span className="block relative h-16">
                <span className={cn(
                  "absolute inset-0",
                  animationClass
                )}>
                  {roles[currentRoleIndex]}
                </span>
              </span>
            </h1>
            <p className="mt-6 text-lg leading-8 text-foreground/80 md:text-xl">
              with a huge amount of curiosity and motivation to create functional
              and pretty things.
            </p>
            <div className="mt-10 flex items-center justify-center gap-x-6 lg:justify-start">
              <Button
                asChild
                size="lg"
                className="bg-accent text-accent-foreground transition-transform hover:scale-105 hover:bg-accent/90"
              >
                <Link href="/works">View portfolio</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="transition-transform hover:scale-105">
                <Link href="#showreel">Watch Showreel</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
