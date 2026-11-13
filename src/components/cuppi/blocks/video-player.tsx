'use client';

import { useState } from 'react';
import { Play } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { FeatureVideo } from '@/lib/features-types';
import { youtubeEmbedUrl, youtubeId } from '@/lib/youtube';

/**
 * Plays a feature video and fills its parent, which sets the shape (16:9 or 9:16). A YouTube video
 * starts as a still with a play button, so the page loads no YouTube code and sets no cookies until
 * the visitor presses play. A video file is a plain video element with the browser's own controls.
 */
export function VideoPlayer({ video, className }: { video: FeatureVideo; className?: string }) {
  const id = youtubeId(video.url);
  const [playing, setPlaying] = useState(false);
  const tall = video.aspect === '9:16';
  const label = video.label || 'Cuppi video';

  if (id) {
    if (playing) {
      return (
        <iframe
          title={label}
          src={youtubeEmbedUrl(id, { autoplay: true })}
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
          className={cn('absolute inset-0 h-full w-full border-0', className)}
        />
      );
    }
    return (
      <button type="button" onClick={() => setPlaying(true)} aria-label={`Play: ${label}`} className={cn('group absolute inset-0 block h-full w-full bg-cuppi-espresso', className)}>
        <YouTubeStill id={id} poster={video.poster} tall={tall} />
        <PlayBadge />
      </button>
    );
  }

  return (
    <video
      // `#t=0.1` makes iOS draw a first frame when there is no cover picture.
      src={video.poster ? video.url : `${video.url}#t=0.1`}
      poster={video.poster}
      controls
      playsInline
      preload="metadata"
      aria-label={label}
      className={cn('absolute inset-0 h-full w-full bg-cuppi-espresso object-contain', className)}
    />
  );
}

/**
 * A cover for a YouTube video: the admin's picture if there is one, otherwise YouTube's own. The
 * widescreen still is the full-size one (no black bars) and a vertical video's is the one that keeps
 * its original shape; each falls back to the plain one if YouTube has not made it.
 */
function YouTubeStill({ id, poster, tall }: { id: string; poster?: string; tall: boolean }) {
  const chain = poster ? [poster] : tall ? [`https://i.ytimg.com/vi/${id}/oar2.jpg`, `https://i.ytimg.com/vi/${id}/hqdefault.jpg`] : [`https://i.ytimg.com/vi/${id}/maxresdefault.jpg`, `https://i.ytimg.com/vi/${id}/hqdefault.jpg`];
  const [step, setStep] = useState(0);
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={chain[step]} alt="" onError={() => setStep((s) => Math.min(s + 1, chain.length - 1))} className="h-full w-full object-cover" />
  );
}

function PlayBadge() {
  return (
    <span className="absolute inset-0 grid place-items-center">
      <span className="grid h-16 w-16 place-items-center rounded-full bg-cuppi-brand-fill text-cuppi-cream transition-transform duration-300 [transition-timing-function:var(--ease-spring)] group-hover:scale-110 sm:h-20 sm:w-20">
        <Play className="ml-1 h-7 w-7 fill-current sm:h-8 sm:w-8" aria-hidden />
      </span>
    </span>
  );
}
