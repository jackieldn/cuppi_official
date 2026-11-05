'use client';

// The 2006 portal's video player: an aqua-blue media player skin, the glossy
// kind you downloaded for your player back then. Videos from Storage get
// working controls (play, pause, stop, seek, volume, full screen). YouTube
// videos keep YouTube's own controls inside the same aqua frame.
//
// On the portal page it sits in the flow at up to 640px wide. As the content of
// a Poot XP window (`fill`) it stretches to fill the window instead, and a
// video opened by double-click (`autoPlay`) starts playing straight away.

import { useEffect, useRef, useState } from 'react';

import { cn } from '@/lib/utils';
import { formatTime } from '@/lib/music-player-types';
import styles from './xp-media-skin.module.css';

interface MediaSkinProps {
  kind: 'file' | 'youtube';
  src: string;
  /** Shown in the player's title strip, like the clip's name. */
  title: string;
  /** Fill the space it is in (a window) rather than sit in a page. */
  fill?: boolean;
  /** Start playing as soon as it appears. For a YouTube video, build `src` with autoplay on too. */
  autoPlay?: boolean;
}

export function MediaSkin({ kind, src, title, fill, autoPlay }: MediaSkinProps) {
  return (
    <div className={cn(styles.frame, fill && styles.fill)}>
      <div className={styles.titleStrip}>
        <span className={styles.logo} aria-hidden="true" />
        <span className={styles.brand}>Poot Media Player</span>
        <span className={styles.clip} title={title}>
          {title}
        </span>
      </div>
      {kind === 'youtube' ? (
        <YouTubeScreen src={src} title={title} />
      ) : (
        <FileScreen src={src} title={title} autoPlay={autoPlay} />
      )}
    </div>
  );
}

function YouTubeScreen({ src, title }: { src: string; title: string }) {
  return (
    <>
      <div className={styles.screen}>
        <iframe src={src} title={title} allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen />
      </div>
      <div className={styles.status}>Streaming: {title}</div>
    </>
  );
}

function FileScreen({ src, title, autoPlay }: { src: string; title: string; autoPlay?: boolean }) {
  const frameRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [muted, setMuted] = useState(false);
  const [broken, setBroken] = useState(false);

  useEffect(() => {
    if (videoRef.current) videoRef.current.volume = volume;
  }, [volume]);

  const toggle = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) v.play().catch(() => setPlaying(false));
    else v.pause();
  };

  const stop = () => {
    const v = videoRef.current;
    if (!v) return;
    v.pause();
    v.currentTime = 0;
    setTime(0);
  };

  const fullScreen = () => {
    const el = frameRef.current;
    if (!el) return;
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else el.requestFullscreen?.().catch(() => {});
  };

  return (
    <div ref={frameRef} className={styles.player}>
      <div className={styles.screen}>
        <video
          ref={videoRef}
          src={src}
          autoPlay={autoPlay}
          playsInline
          preload={autoPlay ? 'auto' : 'metadata'}
          muted={muted}
          aria-label={title}
          onClick={toggle}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => setPlaying(false)}
          onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
          onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
          onError={() => setBroken(true)}
        />
        {!playing && !broken && (
          <button type="button" className={styles.bigPlay} aria-label="Play" onClick={toggle}>
            ▶
          </button>
        )}
        {broken && <p className={styles.broken}>This clip could not be played.</p>}
      </div>

      <input
        type="range"
        className={styles.seek}
        aria-label="Seek"
        min={0}
        max={duration || 1}
        step={0.05}
        value={Math.min(time, duration || 1)}
        disabled={!duration}
        onChange={(e) => {
          const v = Number(e.target.value);
          if (videoRef.current) videoRef.current.currentTime = v;
          setTime(v);
        }}
      />

      <div className={styles.bar}>
        <button
          type="button"
          className={styles.round}
          aria-label={playing ? 'Pause' : 'Play'}
          onClick={toggle}
        >
          {playing ? '❚❚' : '▶'}
        </button>
        <button type="button" className={styles.small} aria-label="Stop" onClick={stop}>
          ■
        </button>
        <span className={styles.time}>
          {formatTime(time)} / {formatTime(duration)}
        </span>
        <span className={styles.spacer} />
        <button
          type="button"
          className={styles.small}
          aria-label={muted ? 'Unmute' : 'Mute'}
          aria-pressed={muted}
          onClick={() => setMuted((m) => !m)}
        >
          {muted ? '🔇' : '🔈'}
        </button>
        <input
          type="range"
          className={styles.volume}
          aria-label="Volume"
          min={0}
          max={1}
          step={0.01}
          value={volume}
          onChange={(e) => {
            setVolume(Number(e.target.value));
            setMuted(false);
          }}
        />
        <button type="button" className={styles.small} aria-label="Full screen" onClick={fullScreen}>
          ⛶
        </button>
      </div>
    </div>
  );
}
