'use client';
/* eslint-disable @next/next/no-img-element -- a tiny YouTube still on a desktop icon; next/image would need every thumbnail host allowed. */

// The desktop's videos: files on the desktop that open in this window. It wears
// the same skin as the music player (cover, seek bar, big accent play button,
// playlist underneath). A video file gets those controls; a YouTube video keeps
// YouTube's own inside the frame, because an embed can't be reskinned. Either
// way it starts playing as soon as it opens. Managed at /admin/videos.

import { useCallback, useEffect, useRef, useState } from 'react';
import { Film, Maximize, Pause, Play, Volume2, VolumeX } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { Slider } from '@/components/ui/slider';
import { formatTime } from '@/lib/music-player-types';
import { videoSource, videoThumbnail } from '@/lib/desktop-video-source';
import type { DesktopVideo } from '@/lib/desktop-videos-types';
import { AppWindow } from '../app-window';
import { useDesktop } from '../desktop-context';
import { useDesktopVideos } from '../use-desktop-videos';
import { iconButton } from './music-app';

/** A video file on the desktop: a YouTube still where there is one, with a play badge. */
export function VideoFileIcon({ video }: { video: DesktopVideo }) {
  const thumb = videoThumbnail(video.url);
  return (
    <span className="relative flex size-14 items-center justify-center overflow-hidden rounded-[14px] bg-[linear-gradient(145deg,#334155_0%,#0f172a_100%)] shadow-[0_6px_16px_-4px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.2)]">
      {thumb ? (
        <img src={thumb} alt="" draggable={false} loading="lazy" className="absolute inset-0 size-full object-cover" />
      ) : (
        <Film aria-hidden="true" className="relative size-7 text-white/90 drop-shadow" strokeWidth={2} />
      )}
      <span aria-hidden="true" className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/25 to-transparent" />
      <span
        aria-hidden="true"
        className="absolute bottom-1 right-1 flex size-4 items-center justify-center rounded-full bg-black/65 text-white"
      >
        <Play className="ml-px size-2.5" fill="currentColor" />
      </span>
    </span>
  );
}

/** The player for a video file: the music player's controls, on a video. */
function FilePlayer({ src, title }: { src: string; title: string }) {
  const stageRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [scrub, setScrub] = useState<number | null>(null);
  const [volume, setVolume] = useState(0.8);
  const [muted, setMuted] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (videoRef.current) videoRef.current.volume = volume;
  }, [volume]);

  const toggle = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) v.play().catch(() => setPlaying(false));
    else v.pause();
  }, []);

  const fullScreen = () => {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else stageRef.current?.requestFullscreen?.().catch(() => {});
  };

  const shown = scrub ?? time;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div ref={stageRef} className="relative min-h-0 flex-1 bg-black">
        <video
          ref={videoRef}
          src={src}
          autoPlay
          playsInline
          preload="auto"
          muted={muted}
          aria-label={title}
          className="absolute inset-0 size-full object-contain"
          onClick={toggle}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => setPlaying(false)}
          onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
          onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
          onError={() => setFailed(true)}
        />
        {failed && (
          <p className="absolute inset-0 flex items-center justify-center text-sm text-white/70">
            This video couldn&apos;t be played.
          </p>
        )}
      </div>

      <div className="shrink-0 space-y-3 px-4 pb-3 pt-3">
        <div className="space-y-1.5">
          <Slider
            aria-label="Seek"
            value={[Math.min(shown, duration)]}
            max={duration || 1}
            step={0.05}
            disabled={!duration}
            onValueChange={([v]) => setScrub(v)}
            onValueCommit={([v]) => {
              if (videoRef.current) videoRef.current.currentTime = v;
              setTime(v);
              setScrub(null);
            }}
            className="[&_[role=slider]]:size-3.5 [&_[role=slider]]:border-accent [&>span:first-child]:h-1.5 [&>span:first-child>span]:bg-accent"
          />
          <div className="flex justify-between text-[11px] tabular-nums text-muted-foreground">
            <span>{formatTime(shown)}</span>
            <span>-{formatTime(Math.max(0, duration - shown))}</span>
          </div>
        </div>

        {/* Play/pause stays centred: the volume group on the left balances full screen on the right. */}
        <div className="grid grid-cols-[1fr_auto_1fr] items-center">
          <div className="flex items-center gap-1">
            <button
              type="button"
              aria-label={muted ? 'Unmute' : 'Mute'}
              aria-pressed={muted}
              className={cn(iconButton, 'size-8')}
              onClick={() => setMuted((m) => !m)}
            >
              {muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
            </button>
            <Slider
              aria-label="Volume"
              value={[muted ? 0 : volume]}
              max={1}
              step={0.01}
              onValueChange={([v]) => {
                setVolume(v);
                setMuted(false);
              }}
              className="w-20 [&_[role=slider]]:size-3 [&_[role=slider]]:border-accent [&>span:first-child]:h-1 [&>span:first-child>span]:bg-accent"
            />
          </div>
          <button
            type="button"
            aria-label={playing ? 'Pause' : 'Play'}
            className={cn(
              iconButton,
              'size-14 bg-accent text-accent-foreground shadow-[0_6px_20px_-6px_hsl(var(--accent))] hover:bg-accent hover:text-accent-foreground hover:brightness-110',
            )}
            onClick={toggle}
          >
            {playing ? <Pause className="size-6" fill="currentColor" /> : <Play className="ml-0.5 size-6" fill="currentColor" />}
          </button>
          <div className="flex justify-end">
            <button type="button" aria-label="Full screen" className={cn(iconButton, 'size-8')} onClick={fullScreen}>
              <Maximize className="size-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function VideoApp() {
  const { videoId, openVideo } = useDesktop();
  const { videos, failed } = useDesktopVideos('2026');
  // Only videos with a link the player can use.
  const playlist = (videos ?? []).filter((v) => videoSource(v.url));
  const current = playlist.find((v) => v.id === videoId) ?? playlist[0];
  // The visitor just double-clicked, so the sound is allowed to start.
  const source = current ? videoSource(current.url, true) : null;

  return (
    <AppWindow
      id="video"
      title={current?.title ?? 'Videos'}
      width={600}
      height={640}
      minWidth={380}
      minHeight={340}
      minimisable
    >
      <div className="flex min-h-0 flex-1 flex-col">
      {!videos && <Skeleton className="min-h-0 w-full flex-1 rounded-none" />}

      {videos && !current && (
        <p className="flex min-h-0 flex-1 items-center justify-center px-6 text-center text-sm text-muted-foreground">
          {failed ? 'The videos could not be opened.' : 'No videos yet. Check back soon.'}
        </p>
      )}

      {current && source?.kind === 'youtube' && (
        <div className="relative min-h-0 flex-1 bg-black">
          <iframe
            // A new video is a new frame, so it starts from the top.
            key={current.id}
            src={source.src}
            title={current.title}
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
            className="absolute inset-0 size-full border-0"
          />
        </div>
      )}
      {current && source?.kind === 'file' && <FilePlayer key={current.id} src={source.src} title={current.title} />}

      {current && (
        <div className={cn('shrink-0 px-4 pb-3 pt-3', source?.kind === 'file' && 'border-t border-palette-lagoon/25')}>
          <p className="truncate text-[15px] font-semibold leading-tight">{current.title}</p>
          <p className="truncate text-xs text-muted-foreground">
            {source?.kind === 'youtube' ? 'Playing from YouTube' : 'Video file'}
          </p>
        </div>
      )}

      {playlist.length > 1 && (
        <ol aria-label="Videos" className="max-h-[132px] overflow-y-auto overscroll-contain border-t border-palette-lagoon/25 py-1">
          {playlist.map((v, i) => {
            const isCurrent = v.id === current?.id;
            return (
              <li key={v.id}>
                <button
                  type="button"
                  aria-current={isCurrent ? 'true' : undefined}
                  className={cn(
                    'flex w-full items-center gap-3 px-4 py-1.5 text-left text-[13px] transition-colors hover:bg-secondary/60 focus-visible:bg-secondary/60 focus-visible:outline-none',
                    isCurrent && 'text-accent',
                  )}
                  onClick={() => !isCurrent && openVideo(v.id)}
                >
                  <span className="flex w-4 shrink-0 justify-center text-xs tabular-nums text-muted-foreground">
                    {isCurrent ? <Play className="size-3" fill="currentColor" /> : i + 1}
                  </span>
                  <span className="min-w-0 flex-1 truncate font-medium">{v.title}</span>
                </button>
              </li>
            );
          })}
        </ol>
      )}
      </div>
    </AppWindow>
  );
}
