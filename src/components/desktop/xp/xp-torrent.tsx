'use client';

// PootTorrent: the fake BitTorrent client on the Poot XP desktop. Nothing is
// ever downloaded. The list is the 2006 videos from /admin/videos, dressed as
// torrents: finished ones sit there "seeding" (their upload speed, peers and
// ratio wander about as if strangers were fetching them) and the odd one is
// still downloading, slowly, with an estimated time that never gets shorter
// fast enough. Double-click a finished one to play it in the Poot Media Player;
// an unfinished one says it can't be played yet.

import { useEffect, useMemo, useReducer, useRef, useState } from 'react';

import { cn } from '@/lib/utils';
import {
  etaSeconds,
  formatEta,
  formatSize,
  formatSpeed,
  torrentFacts,
  type DesktopVideo,
  type TorrentFacts,
} from '@/lib/desktop-videos-types';
import { TorrentIcon } from './xp-icons';
import styles from './xp.module.css';
import own from './xp-torrent.module.css';

/** What a torrent is doing right now. Changes every second, so it lives outside React state. */
interface Live {
  progress: number;
  down: number;
  up: number;
  /** Download speed smoothed over a while, so the estimated time doesn't jump about. */
  avgDown: number;
  uploadedMB: number;
  seedsConnected: number;
  peersConnected: number;
}

type Filter = 'all' | 'downloading' | 'seeding';

const rand = (min: number, max: number) => min + Math.random() * (max - min);
const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));
/** A step of -1, 0 or +1, mostly 0. */
const nudge = () => (Math.random() < 0.25 ? (Math.random() < 0.5 ? -1 : 1) : 0);

function startLive(f: TorrentFacts): Live {
  const done = f.progress >= 100;
  return {
    progress: f.progress,
    down: done ? 0 : f.downloadKBps,
    up: done ? f.uploadKBps : f.downloadKBps * 0.1,
    avgDown: done ? 0 : f.downloadKBps,
    // A finished torrent has been seeding for a while.
    uploadedMB: done ? f.sizeMB * rand(0.2, 2.4) : f.sizeMB * (f.progress / 100) * rand(0, 0.15),
    seedsConnected: done ? 0 : Math.min(f.seeds, Math.round(rand(1, 5))),
    peersConnected: Math.min(f.peers, Math.round(rand(1, 6))),
  };
}

/** One second of swarm activity. */
function step(f: TorrentFacts, live: Live, paused: boolean): Live {
  const next = { ...live };
  const downloading = next.progress < 100;

  if (paused) {
    next.down = 0;
    next.up = 0;
    next.avgDown = next.avgDown * 0.9;
    return next;
  }

  if (downloading) {
    const target = f.downloadKBps;
    // Now and then the connection stalls, as it did.
    next.down = Math.random() < 0.06 ? target * 0.05 : clamp(live.down + rand(-0.35, 0.35) * target, target * 0.3, target * 1.7);
    next.avgDown = live.avgDown * 0.92 + next.down * 0.08;
    next.progress = Math.min(100, live.progress + (next.down / 1024 / f.sizeMB) * 100);
    next.up = clamp(next.down * rand(0.04, 0.2), 0, 40);
    next.seedsConnected = clamp(live.seedsConnected + nudge(), f.seeds > 0 ? 1 : 0, Math.min(f.seeds, 12));
  } else {
    const target = f.uploadKBps;
    next.down = 0;
    // Nobody is asking for it right now, every so often.
    next.up =
      f.peers === 0 || Math.random() < 0.12 ? 0 : clamp(live.up + rand(-0.4, 0.4) * target, target * 0.15, target * 1.8);
    next.seedsConnected = 0;
  }
  next.peersConnected = clamp(live.peersConnected + nudge(), 0, Math.min(f.peers, 14));
  next.uploadedMB = live.uploadedMB + next.up / 1024;
  return next;
}

interface TorrentAppProps {
  /** The 2006 videos, or null while they load. */
  videos: DesktopVideo[] | null;
  failed: boolean;
  /** A finished torrent was opened: play it. */
  onPlay: (video: DesktopVideo) => void;
  /** An unfinished one was opened: it can't be played yet. */
  onIncomplete: (name: string, percent: number) => void;
}

export function TorrentApp({ videos, failed, onPlay, onIncomplete }: TorrentAppProps) {
  const facts = useMemo(
    () => (videos ?? []).map((video) => ({ video, f: torrentFacts(video) })),
    [videos],
  );

  const liveRef = useRef<Record<string, Live>>({});
  const factsRef = useRef(facts);
  factsRef.current = facts;
  const [paused, setPaused] = useState<Set<string>>(new Set());
  const pausedRef = useRef(paused);
  pausedRef.current = paused;
  const sessionRef = useRef({ down: 0, up: 0 });
  const [, render] = useReducer((n: number) => n + 1, 0);

  const [filter, setFilter] = useState<Filter>('all');
  const [selected, setSelected] = useState<string | null>(null);

  // Torrents appear with their starting numbers...
  for (const { video, f } of facts) {
    if (!liveRef.current[video.id]) liveRef.current[video.id] = startLive(f);
  }

  // ...and the swarm moves once a second.
  useEffect(() => {
    const timer = setInterval(() => {
      for (const { video, f } of factsRef.current) {
        const before = liveRef.current[video.id];
        if (!before) continue;
        const after = step(f, before, pausedRef.current.has(video.id));
        sessionRef.current.down += after.down / 1024;
        sessionRef.current.up += after.up / 1024;
        liveRef.current[video.id] = after;
      }
      render();
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const rows = facts.map(({ video, f }) => {
    const live = liveRef.current[video.id] ?? startLive(f);
    const isDone = live.progress >= 100;
    return { video, f, live, isDone, isPaused: !isDone && paused.has(video.id) };
  });
  const shown = rows.filter((r) => filter === 'all' || (filter === 'seeding' ? r.isDone : !r.isDone));
  const counts = {
    all: rows.length,
    downloading: rows.filter((r) => !r.isDone).length,
    seeding: rows.filter((r) => r.isDone).length,
  };
  const current = rows.find((r) => r.video.id === selected);

  const open = (id: string) => {
    const row = rows.find((r) => r.video.id === id);
    if (!row) return;
    if (row.isDone) onPlay(row.video);
    else onIncomplete(row.f.name, row.live.progress);
  };

  const togglePause = () => {
    if (!current || current.isDone) return;
    setPaused((p) => {
      const next = new Set(p);
      if (!next.delete(current.video.id)) next.add(current.video.id);
      return next;
    });
  };

  const totalDown = rows.reduce((sum, r) => sum + r.live.down, 0);
  const totalUp = rows.reduce((sum, r) => sum + r.live.up, 0);
  const empty = videos !== null && shown.length === 0;

  return (
    <>
      <div className={styles.toolbar}>
        <button
          type="button"
          className={styles.toolButton}
          disabled={!current}
          onClick={() => current && open(current.video.id)}
        >
          <TorrentIcon />
          Open
        </button>
        <button
          type="button"
          className={styles.toolButton}
          disabled={!current || current.isDone}
          onClick={togglePause}
        >
          {current?.isPaused ? 'Resume' : 'Pause'}
        </button>
      </div>

      <div className={own.main}>
        <nav className={own.filters} aria-label="Torrents">
          {(
            [
              ['all', 'All Torrents'],
              ['downloading', 'Downloading'],
              ['seeding', 'Seeding'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              aria-current={filter === id ? 'true' : undefined}
              className={cn(own.filter, filter === id && own.filterOn)}
              onClick={() => setFilter(id)}
            >
              {label} ({counts[id]})
            </button>
          ))}
        </nav>

        <div className={own.listWrap} onPointerDown={() => setSelected(null)}>
          <table className={own.list}>
            {/* The name takes whatever the fixed widths leave. */}
            <colgroup>
              {[24, undefined, 56, 100, 76, 56, 56, 62, 62, 58, 50].map((w, i) => (
                <col key={i} style={w ? { width: w } : undefined} />
              ))}
            </colgroup>
            <thead>
              <tr>
                <th className={own.num}>#</th>
                <th>Name</th>
                <th>Size</th>
                <th>Done</th>
                <th>Status</th>
                <th>Seeds</th>
                <th>Peers</th>
                <th>Down</th>
                <th>Up</th>
                <th>ETA</th>
                <th>Ratio</th>
              </tr>
            </thead>
            <tbody>
              {shown.map(({ video, f, live, isDone, isPaused }, i) => {
                const ratio = live.uploadedMB / Math.max(1, isDone ? f.sizeMB : (f.sizeMB * live.progress) / 100);
                return (
                  <tr
                    key={video.id}
                    tabIndex={0}
                    aria-selected={selected === video.id}
                    className={cn(selected === video.id && own.rowOn)}
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      setSelected(video.id);
                    }}
                    onDoubleClick={() => open(video.id)}
                    onKeyDown={(e) => e.key === 'Enter' && open(video.id)}
                  >
                    <td className={own.num}>{i + 1}</td>
                    <td title={f.name}>
                      <span className={cn(own.dot, isDone ? own.dotSeed : isPaused ? own.dotPaused : own.dotDown)} />
                      {f.name}
                    </td>
                    <td>{formatSize(f.sizeMB)}</td>
                    <td>
                      <div className={own.bar}>
                        <div className={cn(own.barFill, isDone && own.barSeed)} style={{ width: `${live.progress}%` }} />
                        <span>{live.progress.toFixed(1)} %</span>
                      </div>
                    </td>
                    <td>{isDone ? 'Seeding' : isPaused ? 'Paused' : 'Downloading'}</td>
                    <td>
                      {live.seedsConnected} ({f.seeds})
                    </td>
                    <td>
                      {live.peersConnected} ({f.peers})
                    </td>
                    <td>{formatSpeed(live.down)}</td>
                    <td>{formatSpeed(live.up)}</td>
                    <td>{isDone ? '' : formatEta(isPaused ? Infinity : etaSeconds(f.sizeMB, live.progress, live.avgDown))}</td>
                    <td>{ratio.toFixed(3)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {videos === null && <p className={own.note}>{failed ? 'Could not read the torrent list.' : 'Loading...'}</p>}
          {empty && (
            <p className={own.note}>
              {rows.length === 0 ? 'No torrents. Drop a .torrent file here to start one.' : 'Nothing here.'}
            </p>
          )}
        </div>
      </div>

      <div className={styles.statusBar}>
        <span className={styles.statusCell}>
          D: {formatSpeed(totalDown) || '0.0 kB/s'} T: {formatSize(sessionRef.current.down)}
        </span>
        <span className={styles.statusCell}>
          U: {formatSpeed(totalUp) || '0.0 kB/s'} T: {formatSize(sessionRef.current.up)}
        </span>
        <span className={styles.statusCell}>DHT: {200 + (rows.length * 37) % 90} nodes</span>
      </div>
    </>
  );
}
