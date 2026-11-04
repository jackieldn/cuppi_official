// Tracks for the desktop easter egg's music player. Each is a short sample
// (about 10 seconds) with optional cover art. Managed at /admin/player.
//
// Firestore: player_tracks/{id}. Files: Storage player_tracks/.

export const PLAYER_TRACKS = 'player_tracks';

export type PlayerTrack = {
  id: string;
  title: string;
  artist: string;
  genre?: string;
  album?: string;
  year?: number;
  audioUrl: string;
  /** Storage path of the audio file, so it can be deleted with the track. */
  audioPath: string;
  coverUrl?: string;
  coverPath?: string;
  /** Length of the sample in seconds, read from the file when it's uploaded. */
  durationSec?: number;
  /** Playlist position, lowest first. */
  order: number;
  createdAt?: unknown;
};

/** 0:07, 1:05 */
export function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const s = Math.floor(seconds);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
