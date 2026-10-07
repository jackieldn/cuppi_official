'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';

export function ShowreelSection() {
  const videoUrl = "https://firebasestorage.googleapis.com/v0/b/studio-5700093446-89b93.firebasestorage.app/o/projects%2F1763125307049_JACK%20SHOWREEL%2023%20MEDIUM_1.mp4?alt=media&token=ddc8d3fb-4144-4d2a-b538-6405fdda9a15";
  const [isPlaying, setIsPlaying] = useState(false);

  return (
    <section 
      id="showreel"
      className={cn(
        "py-24 sm:py-32 transition-colors duration-2000 ease-in-out scroll-mt-20",
        isPlaying ? 'bg-black' : 'bg-background/70'
      )}
    >
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className={cn(
              "font-headline text-4xl font-bold tracking-tight sm:text-5xl transition-colors duration-2000 ease-in-out",
              isPlaying ? 'text-white' : 'text-foreground'
          )}>
            Showreel
          </h2>
        </div>
        <div className="relative mx-auto mt-16 aspect-video w-full max-w-5xl overflow-hidden rounded-2xl shadow-2xl">
          <video
            src={videoUrl}
            controls
            playsInline
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onEnded={() => setIsPlaying(false)}
            className="h-full w-full bg-black"
          />
        </div>
      </div>
    </section>
  );
}
