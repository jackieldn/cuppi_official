// What the desktop's video players put on screen for a video's link. Kept apart
// from desktop-videos-types so that file stays free of imports (the unit tests
// load it straight from Node).

import { youtubeEmbedUrl, youtubeId } from './youtube';

export type VideoSource = { kind: 'youtube'; id: string; src: string } | { kind: 'file'; src: string };

/**
 * What to put in the player for a link: a privacy-friendly YouTube embed, or a
 * plain video element for a file. Only https addresses get through, so a typo
 * (or a hostile edit) can never make the player load anything else.
 */
export function videoSource(url: string | undefined, autoplay = false): VideoSource | null {
  if (!url) return null;
  const id = youtubeId(url);
  if (id) return { kind: 'youtube', id, src: youtubeEmbedUrl(id, { autoplay }) };
  try {
    const parsed = new URL(url.trim());
    return parsed.protocol === 'https:' ? { kind: 'file', src: parsed.toString() } : null;
  } catch {
    return null;
  }
}

/** A still from a YouTube video, for the desktop icon. Files have none. */
export function videoThumbnail(url: string | undefined): string | null {
  const id = youtubeId(url);
  return id ? `https://i.ytimg.com/vi/${id}/mqdefault.jpg` : null;
}

