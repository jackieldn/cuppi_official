'use client';

// The desktop's music player. Plays the short samples managed at
// /admin/player: cover art, equaliser bars that follow the music, a seek bar,
// back, play/pause, skip and repeat, and the playlist underneath. The tracks
// are fetched once when the player opens, not on every page load.
//
// The bars read the sound through the Web Audio analyser. That needs the
// audio file served with CORS headers for this site's address (the Storage
// bucket's CORS config). Where it isn't, the file is loaded the plain way and
// the bars fall back to a canned bounce.

import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import Image from 'next/image';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { Music2, Pause, Play, Repeat, SkipBack, SkipForward } from 'lucide-react';

import { cn } from '@/lib/utils';
import { useFirestore } from '@/firebase';
import { Skeleton } from '@/components/ui/skeleton';
import { Slider } from '@/components/ui/slider';
import { PLAYER_TRACKS, formatTime, type PlayerTrack } from '@/lib/music-player-types';
import { AppWindow } from '../app-window';

// "Back" restarts the track if it's this far in, otherwise goes to the previous one.
const RESTART_AFTER_SEC = 2;
const REST_SCALE = 0.12;

// Analyser settings: 64 frequency bins. The bars use bins 1 to 40 (up to about
// 14 kHz), spread on a log scale so bass and treble each get their share.
// The decibel range and curve were tuned on a real (loud, mastered pop)
// sample: the defaults left every bar pinned near the top.
const FFT_SIZE = 128;
const TOP_BIN = 40;
const MIN_DB = -85;
const MAX_DB = -15;
const SMOOTHING = 0.7;
const TREBLE_BOOST = 0.5;
const CURVE = 2.2;

/**
 * Where each bar's band starts, for `count` bars: log-spaced, but always at
 * least one bin wide, so the low bars don't all read the same bin.
 */
function bandEdges(count: number): number[] {
  const edges = [1];
  for (let i = 1; i <= count; i++) {
    edges.push(Math.max(edges[i - 1] + 1, Math.round(TOP_BIN ** (i / count))));
  }
  return edges;
}

/**
 * Bar heights (0 to 1) for `count` bars from one frame of frequency data.
 * Higher bands are boosted a little: music has far less energy up there, and
 * without it the right-hand bars would barely move. The curve keeps quiet
 * moments low, so the bars visibly pump with the beat.
 */
function barLevels(data: Uint8Array, count: number): number[] {
  const edges = bandEdges(count);
  return Array.from({ length: count }, (_, i) => {
    let sum = 0;
    for (let b = edges[i]; b < edges[i + 1]; b++) sum += data[b] ?? 0;
    const v = (sum / (edges[i + 1] - edges[i]) / 255) * (1 + (i / count) * TREBLE_BOOST);
    return Math.min(1, v ** CURVE);
  });
}

type BarMode = 'live' | 'canned';

/**
 * Equaliser bars. "live": the player sets each bar's height from the music
 * (see the frame loop in MusicApp). "canned": each bar bounces on its own
 * fixed speed, delay and range, so the row looks random. Both settle when the
 * music stops.
 */
function EqBars({ playing, mode, count, className, hueFrom = 30, hueTo = 330 }: {
  playing: boolean;
  mode: BarMode;
  count: number;
  className?: string;
  hueFrom?: number;
  hueTo?: number;
}) {
  const live = mode === 'live';
  return (
    <div
      aria-hidden="true"
      data-eq-live={live ? '' : undefined}
      className={cn('flex items-end gap-[3px]', className)}
    >
      {Array.from({ length: count }, (_, i) => {
        const t = count > 1 ? i / (count - 1) : 0;
        const style: CSSProperties & Record<'--eq-low' | '--eq-high', number> = {
          '--eq-low': 0.12 + ((i * 7) % 5) * 0.04,
          '--eq-high': 0.55 + ((i * 11) % 9) * 0.05,
          background: `linear-gradient(to top, hsl(${hueFrom + (hueTo - hueFrom) * t} 95% 58%), hsl(${hueFrom + (hueTo - hueFrom) * t + 25} 95% 72%))`,
          transformOrigin: 'bottom',
          animation:
            playing && !live
              ? `eq-bar ${360 + ((i * 137) % 420)}ms ease-in-out ${-((i * 91) % 600)}ms infinite alternate`
              : 'none',
          transform: playing ? undefined : `scaleY(${REST_SCALE})`,
          // Live bars are set every frame, so no easing then; both ease down to rest.
          transition: playing && live ? 'none' : 'transform 400ms ease-out',
        };
        return <span key={i} className="h-full flex-1 rounded-full" style={style} />;
      })}
    </div>
  );
}

function Cover({ track }: { track?: PlayerTrack }) {
  return (
    <div className="relative size-24 shrink-0 overflow-hidden rounded-lg bg-[linear-gradient(145deg,#ff9900_0%,#f2545b_55%,#a23b72_100%)] shadow-md">
      {track?.coverUrl ? (
        <Image src={track.coverUrl} alt="" fill sizes="96px" className="object-cover" />
      ) : (
        <Music2 aria-hidden="true" className="absolute inset-0 m-auto size-10 text-white/90" />
      )}
    </div>
  );
}

export const iconButton =
  'flex items-center justify-center rounded-full text-foreground/85 transition-[transform,background-color,color] hover:bg-secondary hover:text-foreground active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-40';

/**
 * Fetches the playlist once. Unlike useFetchCollection, a failure stays inside
 * the player ("Playlist unavailable") instead of going to the site-wide
 * FirebaseErrorListener, which would take the whole page down.
 */
function usePlaylist() {
  const firestore = useFirestore();
  const [tracks, setTracks] = useState<PlayerTrack[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!firestore) return;
    let live = true;
    getDocs(query(collection(firestore, PLAYER_TRACKS), orderBy('order')))
      .then((snap) => {
        if (live) setTracks(snap.docs.map((d) => ({ ...(d.data() as Omit<PlayerTrack, 'id'>), id: d.id })));
      })
      .catch((err) => {
        console.warn('Music player: could not load the playlist.', err);
        if (live) setError(true);
      })
      .finally(() => live && setIsLoading(false));
    return () => {
      live = false;
    };
  }, [firestore]);

  return { tracks, isLoading, error };
}

type AudioGraph = { ctx: AudioContext; analyser: AnalyserNode; data: Uint8Array };

export function MusicApp() {
  const { tracks, isLoading, error } = usePlaylist();

  const audioRef = useRef<HTMLAudioElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  // Off: the playlist plays once and stops. On: it loops.
  const [repeat, setRepeat] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  // While the seek bar is being dragged, show where it's going, not where the audio is.
  const [scrub, setScrub] = useState<number | null>(null);
  const [failed, setFailed] = useState(false);
  // Set when changing track should carry on playing.
  const autoplayRef = useRef(false);

  // Try CORS first (the analyser needs it); drop to a plain load if the bucket
  // doesn't allow this site. A new key gives a fresh <audio>, because one
  // that's been wired into Web Audio stays wired for good.
  const [cors, setCors] = useState(true);
  const [audioKey, setAudioKey] = useState(0);
  const [barMode, setBarMode] = useState<BarMode>('canned');
  const graphRef = useRef<AudioGraph | null>(null);

  const track = tracks[index];
  const hasTracks = tracks.length > 0;
  const isFirst = index === 0;
  const isLast = index === tracks.length - 1;

  /**
   * Plays, wiring the audio into an analyser first if that hasn't happened.
   * Only once the file has loaded in CORS mode: loading proves the bucket
   * allows this site, and without that Web Audio would play silence.
   */
  const play = useCallback(
    (audio: HTMLAudioElement) => {
      if (cors && !graphRef.current && audio.readyState >= HTMLMediaElement.HAVE_METADATA) {
        try {
          const ctx = new AudioContext();
          const analyser = ctx.createAnalyser();
          analyser.fftSize = FFT_SIZE;
          analyser.minDecibels = MIN_DB;
          analyser.maxDecibels = MAX_DB;
          analyser.smoothingTimeConstant = SMOOTHING;
          ctx.createMediaElementSource(audio).connect(analyser);
          analyser.connect(ctx.destination);
          graphRef.current = { ctx, analyser, data: new Uint8Array(analyser.frequencyBinCount) };
          setBarMode('live');
        } catch (err) {
          console.info('Music player: no analyser here, so the bars are animated.', err);
        }
      }
      graphRef.current?.ctx.resume().catch(() => {});
      return audio.play().catch(() => setPlaying(false));
    },
    [cors],
  );

  // One loop per frame while playing: smooth progress (`timeupdate` only fires
  // a few times a second, jumpy on a 10-second sample), and the live bars,
  // set straight on the elements with no React render.
  useEffect(() => {
    if (!playing) return;
    let frame = 0;
    const tick = () => {
      const audio = audioRef.current;
      if (audio) setTime(audio.currentTime);
      const graph = graphRef.current;
      if (graph && rootRef.current) {
        graph.analyser.getByteFrequencyData(graph.data);
        rootRef.current.querySelectorAll<HTMLElement>('[data-eq-live]').forEach((group) => {
          const bars = group.children;
          const levels = barLevels(graph.data, bars.length);
          for (let i = 0; i < bars.length; i++) {
            (bars[i] as HTMLElement).style.transform = `scaleY(${REST_SCALE + (1 - REST_SCALE) * levels[i]})`;
          }
        });
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing]);

  // A new track (or a fresh <audio> after the CORS fallback): start from the
  // top, and keep playing if we were.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !track) return;
    setTime(0);
    setFailed(false);
    if (autoplayRef.current) {
      autoplayRef.current = false;
      play(audio);
    }
  }, [track, audioKey, play]);

  // Closing the player stops the music and releases the audio device.
  useEffect(
    () => () => {
      audioRef.current?.pause();
      graphRef.current?.ctx.close().catch(() => {});
    },
    [],
  );

  const goTo = useCallback(
    (i: number, keepPlaying: boolean) => {
      if (!tracks.length) return;
      autoplayRef.current = keepPlaying;
      const next = (i + tracks.length) % tracks.length;
      if (next === index) {
        // Same track (e.g. a one-track playlist): just restart it.
        const audio = audioRef.current;
        if (audio) {
          audio.currentTime = 0;
          setTime(0);
          if (keepPlaying) play(audio);
          else audio.pause();
        }
        autoplayRef.current = false;
        return;
      }
      setIndex(next);
    },
    [tracks.length, index, play],
  );

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !track) return;
    if (audio.paused) play(audio);
    else audio.pause();
  }, [track, play]);

  const back = useCallback(() => {
    const audio = audioRef.current;
    // Well into the track, or on the first track with repeat off: restart it.
    if (audio && (audio.currentTime > RESTART_AFTER_SEC || (isFirst && !repeat))) {
      audio.currentTime = 0;
      setTime(0);
      return;
    }
    goTo(index - 1, playing);
  }, [goTo, index, playing, isFirst, repeat]);

  // Past the last track: round to the first again, still playing only with repeat on.
  const skip = useCallback(
    () => goTo(index + 1, isLast ? playing && repeat : playing),
    [goTo, index, playing, isLast, repeat],
  );

  // A track finished: on to the next. After the last, loop if repeat is on;
  // otherwise stop, back at the start of the playlist.
  const onEnded = () => {
    if (!isLast) goTo(index + 1, true);
    else goTo(0, repeat);
  };

  // The file didn't load. In CORS mode that's most likely the bucket not
  // allowing this site: retry the plain way on a fresh <audio>, with canned bars.
  const onError = () => {
    if (cors) {
      console.info('Music player: audio not served with CORS here, so the bars are animated, not live.');
      autoplayRef.current = !!audioRef.current && !audioRef.current.paused;
      graphRef.current?.ctx.close().catch(() => {});
      graphRef.current = null;
      setBarMode('canned');
      setCors(false);
      setAudioKey((k) => k + 1);
      return;
    }
    setFailed(true);
    setPlaying(false);
  };

  // The keyboard's media keys and the OS "now playing" panel.
  useEffect(() => {
    if (!('mediaSession' in navigator) || !track) return;
    const session = navigator.mediaSession;
    session.metadata = new MediaMetadata({
      title: track.title,
      artist: track.artist,
      album: track.album ?? '',
      artwork: track.coverUrl ? [{ src: track.coverUrl }] : [],
    });
    session.setActionHandler('play', togglePlay);
    session.setActionHandler('pause', togglePlay);
    session.setActionHandler('previoustrack', back);
    session.setActionHandler('nexttrack', skip);
    return () => {
      (['play', 'pause', 'previoustrack', 'nexttrack'] as const).forEach((a) => session.setActionHandler(a, null));
    };
  }, [track, togglePlay, back, skip]);

  const shown = scrub ?? time;
  const total = duration || track?.durationSec || 0;
  const meta = [track?.genre, track?.year].filter(Boolean).join(' · ');

  return (
    <AppWindow id="music" title="Music" width={360}>
      {track && (
        <audio
          key={audioKey}
          ref={audioRef}
          src={track.audioUrl}
          // Has to be set before the file loads: the analyser needs a CORS response.
          crossOrigin={cors ? 'anonymous' : undefined}
          preload="auto"
          onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={onEnded}
          onError={onError}
        />
      )}

      <div ref={rootRef}>
        <div className="space-y-4 px-4 pb-4 pt-1">
          <div className="flex gap-4">
            {isLoading ? <Skeleton className="size-24 shrink-0 rounded-lg" /> : <Cover track={track} />}
            <div className="flex min-w-0 flex-1 flex-col justify-between py-0.5">
              {isLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              ) : (
                <div className="min-w-0">
                  <p className="truncate text-[15px] font-semibold leading-tight">
                    {track?.title ?? (error ? 'Playlist unavailable' : 'No tracks yet')}
                  </p>
                  <p className="truncate text-[13px] text-foreground/70">
                    {track?.artist ?? (error ? 'Try again later' : 'Check back soon')}
                  </p>
                  {meta && <p className="truncate text-xs text-muted-foreground">{meta}</p>}
                  {failed && <p className="text-xs text-destructive">This track couldn&apos;t be played.</p>}
                </div>
              )}
              <EqBars playing={playing} mode={barMode} count={18} className="h-8" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Slider
              aria-label="Seek"
              value={[Math.min(shown, total)]}
              max={total || 1}
              step={0.01}
              disabled={!hasTracks || !total}
              onValueChange={([v]) => setScrub(v)}
              onValueCommit={([v]) => {
                if (audioRef.current) audioRef.current.currentTime = v;
                setTime(v);
                setScrub(null);
              }}
              className="[&_[role=slider]]:size-3.5 [&_[role=slider]]:border-accent [&>span:first-child]:h-1.5 [&>span:first-child>span]:bg-accent"
            />
            <div className="flex justify-between text-[11px] tabular-nums text-muted-foreground">
              <span>{formatTime(shown)}</span>
              <span>-{formatTime(Math.max(0, total - shown))}</span>
            </div>
          </div>

          {/* Play/pause stays centred: a spacer on the left balances repeat on the right. */}
          <div className="flex items-center justify-center gap-5">
            <span aria-hidden="true" className="size-8" />
            <button type="button" aria-label="Back" className={cn(iconButton, 'size-10')} onClick={back} disabled={!hasTracks}>
              <SkipBack className="size-5" fill="currentColor" />
            </button>
            <button
              type="button"
              aria-label={playing ? 'Pause' : 'Play'}
              className={cn(
                iconButton,
                'size-14 bg-accent text-accent-foreground shadow-[0_6px_20px_-6px_hsl(var(--accent))] hover:bg-accent hover:text-accent-foreground hover:brightness-110',
              )}
              onClick={togglePlay}
              disabled={!hasTracks}
            >
              {playing ? (
                <Pause className="size-6" fill="currentColor" />
              ) : (
                <Play className="ml-0.5 size-6" fill="currentColor" />
              )}
            </button>
            <button type="button" aria-label="Skip" className={cn(iconButton, 'size-10')} onClick={skip} disabled={!hasTracks}>
              <SkipForward className="size-5" fill="currentColor" />
            </button>
            <button
              type="button"
              aria-label="Repeat playlist"
              aria-pressed={repeat}
              title={repeat ? 'Repeat is on' : 'Repeat is off'}
              className={cn(
                iconButton,
                // A dot under the icon while it's on, like Apple Music.
                "relative size-8 after:absolute after:bottom-0 after:left-1/2 after:size-1 after:-translate-x-1/2 after:rounded-full after:bg-accent after:transition-opacity after:content-['']",
                repeat ? 'text-accent after:opacity-100 hover:text-accent' : 'text-foreground/55 after:opacity-0',
              )}
              onClick={() => setRepeat((r) => !r)}
              disabled={!hasTracks}
            >
              <Repeat className="size-4" strokeWidth={2.25} />
            </button>
          </div>
        </div>

        {hasTracks && (
          <ol
            aria-label="Playlist"
            className="max-h-[176px] overflow-y-auto overscroll-contain border-t border-palette-lagoon/25 py-1"
          >
            {tracks.map((t, i) => {
              const current = i === index;
              return (
                <li key={t.id}>
                  <button
                    type="button"
                    aria-current={current ? 'true' : undefined}
                    className={cn(
                      'flex w-full items-center gap-3 px-4 py-1.5 text-left text-[13px] transition-colors hover:bg-secondary/60 focus-visible:bg-secondary/60 focus-visible:outline-none',
                      current && 'text-accent',
                    )}
                    onClick={() => (current ? togglePlay() : goTo(i, true))}
                  >
                    <span className="flex w-4 shrink-0 justify-center text-xs tabular-nums text-muted-foreground">
                      {current && playing ? (
                        <EqBars playing mode={barMode} count={3} className="h-3 w-3.5 gap-[2px]" />
                      ) : (
                        i + 1
                      )}
                    </span>
                    <span className="min-w-0 flex-1 truncate">
                      <span className="font-medium">{t.title}</span>
                      <span className={current ? 'text-accent/70' : 'text-muted-foreground'}> · {t.artist}</span>
                    </span>
                    {t.durationSec !== undefined && (
                      <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                        {formatTime(t.durationSec)}
                      </span>
                    )}
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
