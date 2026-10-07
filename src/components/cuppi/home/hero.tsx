'use client';

import Image from 'next/image';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import type { HomePage } from '@/lib/home-page-types';

export function HomeHero({ hero }: { hero: HomePage['hero'] }) {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Using a short timeout to ensure the animation starts after the initial paint.
    const timer = setTimeout(() => {
      setIsLoaded(true);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <section className="w-full max-w-6xl">
      <div className="relative w-full overflow-hidden rounded-[2rem] aspect-[1.5/2] md:aspect-[16/9]">
        <div className={cn("absolute inset-0 opacity-0", isLoaded && "animate-fade-in-up")}>
            <Image
              src={hero.image.url}
              alt={hero.image.alt}
              fill
              sizes="1000vw"
              priority
              className={cn(
                "object-cover transition-transform ease-out",
                "duration-4000",
                isLoaded ? "scale-150 md:scale-130" : "scale-[1.45] md:scale-[1.25]",
                "translate-x-[-80px] md:translate-x-[100px] md:-translate-y-[50px]"
              )}
            />
        </div>
        <div className="absolute inset-0 flex items-center justify-center text-center md:text-left bg-black/20">
          <div className="relative text-white text-center md:text-center bottom-[60px] md:bottom-auto md:right-[200px]">
            <h1 className="font-sf-pro text-xl md:text-2xl font-normal tracking-wide opacity-0 animate-fade-in-right [text-shadow:0_2px_8px_rgba(0,0,0,0.6)]">
              {hero.line1}
            </h1>
            <p className="relative font-serif text-5xl md:text-5xl italic -mt-2 opacity-0 animate-fade-in-right delay-2000 [text-shadow:0_2px_8px_rgba(0,0,0,0.6)] md:pr-[20px]">
              {hero.line2}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
