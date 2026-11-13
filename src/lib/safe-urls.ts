// Which addresses a page may show. Anything an admin types or a database returns is checked here
// before it reaches an <Image>, <video> or <iframe>, so a bad value hides the picture or video
// rather than breaking the page. No imports from the app, so the unit tests can load it from Node.

import { youtubeId, youtubeWatchUrl } from './youtube.ts';

const STORAGE_PREFIX = 'https://firebasestorage.googleapis.com/v0/b/studio-5700093446-89b93.firebasestorage.app/';

/**
 * A picture address that is safe to give next/image: a file on this site, or one in the site's
 * own Firebase Storage bucket (where admin uploads go). next/image refuses any other host, so
 * letting one through here would break the page instead of just hiding the picture.
 */
export function safeImageUrl(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const v = value.trim();
  if (v.startsWith('/') && !v.startsWith('//') && !/\s/.test(v)) return v;
  return v.startsWith(STORAGE_PREFIX) && !/\s/.test(v) ? v : undefined;
}

/** What a video address is. `youtube` plays in a privacy-friendly embed; `file` in a plain video element. */
export type VideoKind = 'youtube' | 'file';

export function videoKind(value: unknown): VideoKind | null {
  if (typeof value !== 'string') return null;
  if (youtubeId(value)) return 'youtube';
  return safeVideoUrl(value) ? 'file' : null;
}

/**
 * A video address that is safe to play: a YouTube link (any shape; it is tidied to the plain
 * watch address, and only its 11-character id ever reaches an iframe), a file on this site, or an
 * https address of a video file (admin uploads land in our own Firebase Storage).
 */
export function safeVideoUrl(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const v = value.trim();
  if (!v || /\s/.test(v)) return undefined;
  const id = youtubeId(v);
  if (id) return youtubeWatchUrl(id);
  if (v.startsWith('/') && !v.startsWith('//')) return v;
  try {
    const parsed = new URL(v);
    return parsed.protocol === 'https:' ? parsed.toString() : undefined;
  } catch {
    return undefined;
  }
}
