// Videos for the desktop easter egg, shared by both eras. Each one is a link
// (a YouTube video or a direct video file) tagged with the era it shows up in:
//
//   2006: PootTorrent, the fake BitTorrent client, lists them as downloaded
//         files (plus a couple that are still slowly downloading). Opening one
//         plays it in the Poot Media Player.
//   2026: they are the video files in the desktop's Favourites folder and play in
//         the Videos window, which wears the same skin as the music player.
//         (The desktop's other folder, Portfolio videos, holds the videos
//         uploaded to the Work projects; see portfolio-videos.ts.)
//
// Managed at /admin/videos. Firestore: desktop_videos/{id}. Public read, admin write.

export const DESKTOP_VIDEOS = 'desktop_videos';

export const VIDEO_ERAS = ['2006', '2026'] as const;
export type VideoEra = (typeof VIDEO_ERAS)[number];

export type TorrentStatus = 'seeding' | 'downloading';

export type DesktopVideo = {
  id: string;
  /** What the video is called in the player and on the desktop. */
  title: string;
  /** A YouTube link or the address of a video file. Optional only for a download that never finishes. */
  url?: string;
  /** Which desktops it appears on. */
  eras: VideoEra[];
  /** Position in the list, lowest first. */
  order: number;

  // The rest only matters in 2006, where the video is a torrent. Anything left
  // out is made up from the title (see torrentFacts), so a bare link still works.
  /** The messy file name shown in the torrent client, e.g. "Borat.2006.DVDRip.XviD-aXXo". */
  torrentName?: string;
  status?: TorrentStatus;
  sizeMB?: number;
  /** Per cent done, for a download in progress. */
  progress?: number;
  /** How fast it downloads, in kB/s. Together with the size and progress this sets the estimated time. */
  downloadKBps?: number;
  /** About how fast it uploads while seeding, in kB/s. */
  uploadKBps?: number;
  /** How many seeds and peers the swarm has. */
  seeds?: number;
  peers?: number;
  createdAt?: unknown;
};

export const hasEra = (video: Pick<DesktopVideo, 'eras'>, era: VideoEra): boolean => video.eras?.includes(era) ?? false;

// -------------------------------------------------------------- the torrent

/** A number from 0 up to (not including) 1 that is always the same for the same text. */
export function hash01(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 100000) / 100000;
}

export interface TorrentFacts {
  name: string;
  status: TorrentStatus;
  sizeMB: number;
  /** Per cent, 0 to 100. */
  progress: number;
  downloadKBps: number;
  uploadKBps: number;
  seeds: number;
  peers: number;
}

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));
const positive = (n: number | undefined): n is number => typeof n === 'number' && Number.isFinite(n) && n > 0;

/** The torrent's numbers, with anything the admin left blank filled in from the title so it is always the same. */
export function torrentFacts(video: DesktopVideo): TorrentFacts {
  const seed = video.id || video.title;
  const status: TorrentStatus = video.status === 'downloading' ? 'downloading' : 'seeding';
  return {
    name: video.torrentName?.trim() || video.title,
    status,
    sizeMB: positive(video.sizeMB) ? video.sizeMB : Math.round(180 + hash01(`${seed}:size`) * 620),
    progress: status === 'seeding' ? 100 : clamp(Number(video.progress) || 0, 0, 99.9),
    downloadKBps: positive(video.downloadKBps) ? video.downloadKBps : Math.round(20 + hash01(`${seed}:down`) * 60),
    uploadKBps: positive(video.uploadKBps) ? video.uploadKBps : Math.round(6 + hash01(`${seed}:up`) * 50),
    seeds: positive(video.seeds) ? Math.round(video.seeds) : Math.round(3 + hash01(`${seed}:seeds`) * 60),
    peers: positive(video.peers) ? Math.round(video.peers) : Math.round(1 + hash01(`${seed}:peers`) * 25),
  };
}

/** 1.37 GB, 698 MB, 42.5 MB */
export function formatSize(mb: number): string {
  if (!Number.isFinite(mb) || mb < 0) return '';
  if (mb >= 1024) return `${(mb / 1024).toFixed(2)} GB`;
  return mb >= 100 ? `${Math.round(mb)} MB` : `${mb.toFixed(1)} MB`;
}

/** 35.2 kB/s, 1.20 MB/s. Nothing at all for a standstill, like the real client. */
export function formatSpeed(kbps: number): string {
  if (!Number.isFinite(kbps) || kbps < 0.05) return '';
  return kbps >= 1024 ? `${(kbps / 1024).toFixed(2)} MB/s` : `${kbps.toFixed(1)} kB/s`;
}

/** Seconds left to download, or Infinity if nothing is coming in. */
export function etaSeconds(sizeMB: number, progress: number, kbps: number): number {
  if (!(kbps > 0.05)) return Infinity;
  const remainingKB = sizeMB * 1024 * (1 - clamp(progress, 0, 100) / 100);
  return remainingKB / kbps;
}

/** 42s, 9m 05s, 9h 41m, 3d 2h, or ∞ when it will never finish. */
export function formatEta(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '∞';
  const s = Math.round(seconds);
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, '0')}s`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}m`;
  return `${Math.floor(s / 86400)}d ${Math.floor((s % 86400) / 3600)}h`;
}
