'use client';

import Image from 'next/image';
import { useCallback, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export type LightboxImage = {
  src: string;
  alt: string;
};

interface ImageLightboxProps {
  images: LightboxImage[];
  /** The image on show, or null when the viewer is closed. */
  index: number | null;
  /** Called with the new index, or null to close. */
  onIndexChange: (index: number | null) => void;
  title: string;
}

// Drags shorter than this (in px) are taps, not swipes.
const SWIPE_MIN_PX = 50;

/**
 * Full-size image viewer shared by the project gallery, Best of Snaps and Free time.
 * Fills almost the whole screen, steps through the images with the on-screen arrows,
 * the left and right arrow keys, or a swipe, and wraps around at either end.
 */
export function ImageLightbox({ images, index, onIndexChange, title }: ImageLightboxProps) {
  const count = images.length;
  const open = index !== null && count > 0;

  const step = useCallback(
    (delta: number) => {
      if (index === null || count === 0) return;
      onIndexChange((index + delta + count) % count);
    },
    [index, count, onIndexChange],
  );

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        step(1);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        step(-1);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, step]);

  // Warm up the neighbours so stepping through feels instant.
  useEffect(() => {
    if (index === null || count < 2) return;
    [(index + 1) % count, (index - 1 + count) % count].forEach((i) => {
      const preload = new window.Image();
      preload.src = images[i].src;
    });
  }, [index, count, images]);

  const touchStartX = useRef<number | null>(null);

  const current = open ? images[index] : null;

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onIndexChange(null)}>
      <DialogContent
        className="h-[94vh] w-[96vw] max-w-none border-0 bg-transparent p-0 shadow-none sm:rounded-none [&>button:last-child]:right-3 [&>button:last-child]:top-3 [&>button:last-child]:rounded-full [&>button:last-child]:bg-black/50 [&>button:last-child]:p-2 [&>button:last-child]:text-white [&>button:last-child]:opacity-100 [&>button:last-child]:hover:bg-black/70 [&>button:last-child_svg]:h-5 [&>button:last-child_svg]:w-5"
        onTouchStart={(e) => {
          touchStartX.current = e.touches[0].clientX;
        }}
        onTouchEnd={(e) => {
          if (touchStartX.current === null) return;
          const dx = e.changedTouches[0].clientX - touchStartX.current;
          touchStartX.current = null;
          if (Math.abs(dx) >= SWIPE_MIN_PX) step(dx < 0 ? 1 : -1);
        }}
      >
        <DialogTitle className="sr-only">{title}</DialogTitle>
        <DialogDescription className="sr-only">
          Image {open ? index + 1 : 0} of {count}. Use the left and right arrow keys to move between images.
        </DialogDescription>
        {current && (
          <div className="relative h-full w-full">
            <Image
              key={current.src}
              src={current.src}
              alt={current.alt}
              fill
              sizes="96vw"
              className="object-contain"
              priority
            />
          </div>
        )}
        {count > 1 && (
          <>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => step(-1)}
              className="absolute left-3 top-1/2 h-12 w-12 -translate-y-1/2 rounded-full bg-black/40 text-white hover:bg-black/60 hover:text-white"
              aria-label="Previous image"
            >
              <ChevronLeft className="h-8 w-8" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => step(1)}
              className="absolute right-3 top-1/2 h-12 w-12 -translate-y-1/2 rounded-full bg-black/40 text-white hover:bg-black/60 hover:text-white"
              aria-label="Next image"
            >
              <ChevronRight className="h-8 w-8" />
            </Button>
            <div className="pointer-events-none absolute left-1/2 top-3 -translate-x-1/2 rounded-full bg-black/50 px-3 py-1 text-sm text-white tabular-nums">
              {open ? index + 1 : 0} / {count}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
