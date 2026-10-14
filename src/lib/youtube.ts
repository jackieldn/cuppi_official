// YouTube links in content come in several shapes (watch, share, embed, shorts).
// Only an 11-character video id ever reaches an iframe src, so editor-supplied
// text can never choose the iframe's host or path.

const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;
const YOUTUBE_HOSTS = new Set(['youtube.com', 'www.youtube.com', 'm.youtube.com', 'music.youtube.com', 'youtube-nocookie.com', 'www.youtube-nocookie.com']);

export function youtubeId(input: unknown): string | null {
  if (typeof input !== 'string') return null;
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
  const host = url.hostname.toLowerCase();

  let candidate: string | null = null;
  if (host === 'youtu.be') {
    candidate = url.pathname.split('/')[1] ?? null;
  } else if (YOUTUBE_HOSTS.has(host)) {
    const [, first, second] = url.pathname.split('/');
    if (first === 'watch') candidate = url.searchParams.get('v');
    else if (first === 'embed' || first === 'shorts' || first === 'live' || first === 'v') candidate = second ?? null;
  }
  return candidate && VIDEO_ID.test(candidate) ? candidate : null;
}

/** Privacy-enhanced embed: YouTube sets no cookies until the visitor presses play. */
export function youtubeEmbedUrl(id: string): string {
  return `https://www.youtube-nocookie.com/embed/${id}?rel=0`;
}

export function youtubeWatchUrl(id: string): string {
  return `https://www.youtube.com/watch?v=${id}`;
}

export type VideoSize = { width: number; height: number };

/** Width and height from a JPEG's start-of-frame header, or null if the bytes are not a readable JPEG. */
export function jpegSize(bytes: Uint8Array): VideoSize | null {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;
  let i = 2;
  while (i + 8 < bytes.length) {
    if (bytes[i] !== 0xff) {
      i++;
      continue;
    }
    const marker = bytes[i + 1];
    if (marker === 0xff) {
      i++; // fill byte
      continue;
    }
    // Markers that carry no length field.
    if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      i += 2;
      continue;
    }
    const length = (bytes[i + 2] << 8) | bytes[i + 3];
    // SOF0-SOF15 hold the dimensions (C4, C8 and CC share the range but are not frame headers).
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      const height = (bytes[i + 5] << 8) | bytes[i + 6];
      const width = (bytes[i + 7] << 8) | bytes[i + 8];
      return width > 0 && height > 0 ? { width, height } : null;
    }
    if (length < 2) return null;
    i += 2 + length;
  }
  return null;
}

/**
 * The video's real shape. Shorts and other vertical videos are common for app
 * walkthroughs, and in a 16:9 frame they shrink to a sliver, so the embed needs
 * to know. YouTube's "oar2" thumbnail keeps the original aspect ratio (a 9:16
 * video gives a tall image) and is served from the image CDN, unlike the watch
 * and shorts pages, which send many visitors to a consent screen. Only the first
 * few KB are needed. Returns null if anything goes wrong; callers then use 16:9.
 */
export async function youtubeVideoSize(id: string, fetcher: typeof fetch = fetch): Promise<VideoSize | null> {
  try {
    const res = await fetcher(`https://i.ytimg.com/vi/${id}/oar2.jpg`, {
      headers: { Range: 'bytes=0-16383' },
      signal: AbortSignal.timeout(4000),
      // Cached by Next for a day, so the page is not slowed down by it.
      next: { revalidate: 60 * 60 * 24 },
    });
    if (!res.ok) return null;
    return jpegSize(new Uint8Array(await res.arrayBuffer()));
  } catch {
    return null;
  }
}

/** Frame shape for an embed: a narrow portrait frame for vertical video, otherwise 16:9. */
export function videoFrame(size: VideoSize | null): { portrait: boolean; aspectRatio: string } {
  if (size) {
    const ratio = size.width / size.height;
    if (ratio < 0.9) return { portrait: true, aspectRatio: String(Math.round(Math.min(Math.max(ratio, 0.4), 0.9) * 10000) / 10000) };
  }
  return { portrait: false, aspectRatio: '16 / 9' };
}
