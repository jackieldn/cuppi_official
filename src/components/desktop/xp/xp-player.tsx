'use client';

// Poot Amp: the music player on the Poot XP desktop. A little black box with
// an LCD for the time and a scrolling title, a spectrum that follows the
// music, the classic row of transport buttons and a playlist.
//
// The trick: it's 2006, so the playlist only holds songs from 2006 or
// earlier. Tracks from /admin/player with a later year, or no year at all,
// aren't on this computer yet.
//
// The spectrum reads the sound through the Web Audio analyser, which needs the
// audio served with CORS headers for this site. Where it isn't, the file is
// loaded the plain way and the spectrum falls back to a canned bounce.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { cn } from '@/lib/utils';
import { formatTime, type PlayerTrack } from '@/lib/music-player-types';
import { usePortalData } from './portal-data';
import styles from './xp-player.module.css';

/** The newest year a song can be from and still exist on this computer. */
export const LATEST_YEAR = 2006;

export const isOfTheTime = (track: Pick<PlayerTrack, 'year'>): boolean =>
  typeof track.year === 'number' && track.year <= LATEST_YEAR;

const BARS = 28;
const FFT_SIZE = 128;
const TOP_BIN = 40;
const MIN_DB = -85;
const MAX_DB = -15;
const RESTART_AFTER_SEC = 2;

type AudioGraph = { ctx: AudioContext; analyser: AnalyserNode; data: Uint8Array };

/** Where each bar's band starts: log-spaced, always at least one bin wide. */
function bandEdges(count: number): number[] {
  const edges = [1];
  for (let i = 1; i <= count; i++) edges.push(Math.max(edges[i - 1] + 1, Math.round(TOP_BIN ** (i / count))));
  return edges;
}
const EDGES = bandEdges(BARS);

const pad = (n: number) => String(n).padStart(2, '0');
const lcdTime = (seconds: number) => {
  const s = Math.max(0, Math.floor(seconds));
  return `${pad(Math.floor(s / 60))}:${pad(s % 60)}`;
};

interface PootAmpProps {
  /** The tray's speaker button: muted, the music keeps its place but makes no sound. */
  muted: boolean;
}

export function PootAmp({ muted }: PootAmpProps) {
  const { data, failed } = usePortalData();
  const all = data?.tracks;
  const tracks = useMemo(() => (all ?? []).filter(isOfTheTime), [all]);

  const audioRef = useRef<HTMLAudioElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const graphRef = useRef<AudioGraph | null>(null);
  const autoplayRef = useRef(false);

  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [broken, setBroken] = useState(false);
  // Try CORS first (the analyser needs it); a new key gives a fresh <audio> for the plain fallback.
  const [cors, setCors] = useState(true);
  const [audioKey, setAudioKey] = useState(0);
  const [live, setLive] = useState(false);

  const track: PlayerTrack | undefined = tracks[index];
  const total = duration || track?.durationSec || 0;

  const play = useCallback(
    (audio: HTMLAudioElement) => {
      if (cors && !graphRef.current && audio.readyState >= HTMLMediaElement.HAVE_METADATA) {
        try {
          const ctx = new AudioContext();
          const analyser = ctx.createAnalyser();
          analyser.fftSize = FFT_SIZE;
          analyser.minDecibels = MIN_DB;
          analyser.maxDecibels = MAX_DB;
          analyser.smoothingTimeConstant = 0.7;
          ctx.createMediaElementSource(audio).connect(analyser);
          analyser.connect(ctx.destination);
          graphRef.current = { ctx, analyser, data: new Uint8Array(analyser.frequencyBinCount) };
          setLive(true);
        } catch (err) {
          console.info('Poot Amp: no analyser here, so the spectrum is canned.', err);
        }
      }
      graphRef.current?.ctx.resume().catch(() => {});
      return audio.play().catch(() => setPlaying(false));
    },
    [cors],
  );

  // A new track (or a fresh <audio>): from the top, and playing on if we were.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !track) return;
    setTime(0);
    setBroken(false);
    if (autoplayRef.current) {
      autoplayRef.current = false;
      play(audio);
    }
  }, [track, audioKey, play]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume, audioKey, track]);

  // Closing the player stops the music and lets go of the sound card.
  useEffect(
    () => () => {
      audioRef.current?.pause();
      graphRef.current?.ctx.close().catch(() => {});
    },
    [],
  );

  // One loop per frame while playing: smooth time and the spectrum, drawn straight to the canvas.
  useEffect(() => {
    const canvas = canvasRef.current;
    const g = canvas?.getContext('2d');
    if (!canvas || !g) return;
    const levels = new Array<number>(BARS).fill(0);
    const peaks = new Array<number>(BARS).fill(0);
    let frame = 0;
    const draw = (now: number) => {
      const audio = audioRef.current;
      const graph = graphRef.current;
      if (playing && audio) setTime(audio.currentTime);
      if (playing && live && graph) {
        graph.analyser.getByteFrequencyData(graph.data);
        for (let i = 0; i < BARS; i++) {
          let sum = 0;
          for (let b = EDGES[i]; b < EDGES[i + 1]; b++) sum += graph.data[b] ?? 0;
          const v = (sum / (EDGES[i + 1] - EDGES[i]) / 255) * (1 + (i / BARS) * 0.5);
          levels[i] = Math.min(1, v ** 2.2);
        }
      } else if (playing) {
        for (let i = 0; i < BARS; i++) {
          levels[i] = 0.18 + 0.62 * Math.abs(Math.sin(now / (260 + ((i * 53) % 300)) + i * 1.7)) ** 1.5;
        }
      } else {
        for (let i = 0; i < BARS; i++) levels[i] *= 0.88;
      }
      const w = canvas.width;
      const h = canvas.height;
      g.clearRect(0, 0, w, h);
      const barW = w / BARS;
      for (let i = 0; i < BARS; i++) {
        const bh = Math.max(2, levels[i] * h);
        peaks[i] = Math.max(bh, peaks[i] - 0.8);
        const grad = g.createLinearGradient(0, h, 0, 0);
        grad.addColorStop(0, '#1f7fb8');
        grad.addColorStop(0.7, '#6fd3ff');
        grad.addColorStop(1, '#eafaff');
        g.fillStyle = grad;
        g.fillRect(i * barW + 1, h - bh, barW - 2, bh);
        g.fillStyle = '#d9f4ff';
        g.fillRect(i * barW + 1, h - peaks[i] - 2, barW - 2, 1.5);
      }
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [playing, live]);

  const goTo = useCallback(
    (i: number, keepPlaying: boolean) => {
      if (!tracks.length) return;
      const next = (i + tracks.length) % tracks.length;
      autoplayRef.current = keepPlaying;
      if (next === index) {
        const audio = audioRef.current;
        autoplayRef.current = false;
        if (!audio) return;
        audio.currentTime = 0;
        setTime(0);
        if (keepPlaying) play(audio);
        else audio.pause();
        return;
      }
      setIndex(next);
    },
    [tracks.length, index, play],
  );

  const randomOther = useCallback(() => {
    if (tracks.length < 2) return index;
    let i = index;
    while (i === index) i = Math.floor(Math.random() * tracks.length);
    return i;
  }, [tracks.length, index]);

  const next = useCallback(
    (keepPlaying: boolean) => goTo(shuffle ? randomOther() : index + 1, keepPlaying),
    [goTo, shuffle, randomOther, index],
  );

  const previous = () => {
    const audio = audioRef.current;
    if (audio && audio.currentTime > RESTART_AFTER_SEC) {
      audio.currentTime = 0;
      setTime(0);
      return;
    }
    goTo(shuffle ? randomOther() : index - 1, playing);
  };

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio || !track) return;
    if (audio.paused) play(audio);
    else audio.pause();
  };

  const pause = () => audioRef.current?.pause();

  const stop = () => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    audio.currentTime = 0;
    setTime(0);
  };

  const onEnded = () => {
    const last = index === tracks.length - 1;
    if (shuffle) return next(true);
    if (!last || repeat) return goTo(index + 1, true);
    // The end of the list: back to the top, stopped.
    goTo(0, false);
  };

  // The file didn't load. In CORS mode that's likely the bucket not allowing this site: retry plain.
  const onError = () => {
    if (cors) {
      autoplayRef.current = !!audioRef.current && !audioRef.current.paused;
      graphRef.current?.ctx.close().catch(() => {});
      graphRef.current = null;
      setLive(false);
      setCors(false);
      setAudioKey((k) => k + 1);
      return;
    }
    setBroken(true);
    setPlaying(false);
  };

  const heading = track ? `${track.artist} - ${track.title}` : '';
  const info = [track?.album, track?.year].filter(Boolean).join(' · ');
  const status = !data
    ? failed
      ? 'Could not load the playlist.'
      : 'Loading playlist...'
    : tracks.length === 0
      ? 'No songs yet.'
      : broken
        ? 'This song could not be played.'
        : '';

  return (
    <div className={styles.amp}>
      {track && (
        <audio
          key={audioKey}
          ref={audioRef}
          src={track.audioUrl}
          crossOrigin={cors ? 'anonymous' : undefined}
          preload="auto"
          muted={muted}
          onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={onEnded}
          onError={onError}
        />
      )}

      <div className={styles.display}>
        <div className={styles.lcd}>
          <div className={styles.clock} aria-label={`Position ${lcdTime(time)}`}>
            <span className={styles.state}>{playing ? '▶' : time > 0 ? '❚❚' : '■'}</span>
            {lcdTime(time)}
          </div>
          <canvas ref={canvasRef} className={styles.spectrum} width={168} height={44} aria-hidden="true" />
        </div>
        <div className={styles.ticker} title={heading}>
          {heading ? (
            <span key={heading} className={cn(styles.tickerText, heading.length > 34 && styles.tickerScroll)}>
              {heading}
              {heading.length > 34 && <span aria-hidden="true">{`  ***  ${heading}`}</span>}
            </span>
          ) : (
            <span className={styles.tickerIdle}>{status || 'Poot Amp'}</span>
          )}
        </div>
        <div className={styles.facts}>
          <span>{track?.genre ?? ' '}</span>
          <span>{info || ' '}</span>
          <span>{live ? 'LIVE' : 'STEREO'}</span>
        </div>
      </div>

      <input
        type="range"
        className={cn(styles.slider, styles.seek)}
        aria-label="Seek"
        min={0}
        max={total || 1}
        step={0.01}
        value={Math.min(time, total || 1)}
        disabled={!track || !total}
        onChange={(e) => {
          const v = Number(e.target.value);
          if (audioRef.current) audioRef.current.currentTime = v;
          setTime(v);
        }}
      />

      <div className={styles.controls}>
        <div className={styles.transport}>
          <button type="button" className={styles.btn} aria-label="Previous" disabled={!track} onClick={previous}>
            ⏮
          </button>
          <button
            type="button"
            className={cn(styles.btn, playing && styles.btnOn)}
            aria-label="Play"
            aria-pressed={playing}
            disabled={!track}
            onClick={() => !playing && toggle()}
          >
            ▶
          </button>
          <button type="button" className={styles.btn} aria-label="Pause" disabled={!track} onClick={pause}>
            ❚❚
          </button>
          <button type="button" className={styles.btn} aria-label="Stop" disabled={!track} onClick={stop}>
            ■
          </button>
          <button type="button" className={styles.btn} aria-label="Next" disabled={!track} onClick={() => next(playing)}>
            ⏭
          </button>
        </div>
        <div className={styles.toggles}>
          <button
            type="button"
            className={cn(styles.chip, shuffle && styles.chipOn)}
            aria-pressed={shuffle}
            onClick={() => setShuffle((s) => !s)}
          >
            SHUF
          </button>
          <button
            type="button"
            className={cn(styles.chip, repeat && styles.chipOn)}
            aria-pressed={repeat}
            onClick={() => setRepeat((r) => !r)}
          >
            REP
          </button>
        </div>
        <label className={styles.volume}>
          <span aria-hidden="true">🔈</span>
          <input
            type="range"
            className={styles.slider}
            aria-label="Volume"
            min={0}
            max={1}
            step={0.01}
            value={volume}
            onChange={(e) => setVolume(Number(e.target.value))}
          />
        </label>
      </div>

      <div className={styles.listHead}>
        <span>Playlist</span>
        <span>
          {tracks.length} {tracks.length === 1 ? 'song' : 'songs'}
        </span>
      </div>
      <ol className={styles.list} aria-label="Playlist">
        {tracks.map((t, i) => (
          <li key={t.id}>
            <button
              type="button"
              className={cn(styles.row, i === index && styles.rowActive)}
              aria-current={i === index ? 'true' : undefined}
              onClick={() => (i === index ? !playing && toggle() : goTo(i, true))}
            >
              <span className={styles.rowNum}>{i + 1}.</span>
              <span className={styles.rowName}>
                {t.artist} - {t.title}
              </span>
              <span className={styles.rowYear}>{t.year}</span>
              <span className={styles.rowTime}>{t.durationSec !== undefined ? formatTime(t.durationSec) : ''}</span>
            </button>
          </li>
        ))}
        {status && tracks.length === 0 && <li className={styles.empty}>{status}</li>}
      </ol>
    </div>
  );
}
