import { videoFrame, youtubeEmbedUrl, youtubeId, youtubeVideoSize, youtubeWatchUrl } from '@/lib/youtube';
import { cn } from '@/lib/utils';

/**
 * A playable YouTube video. Uses the privacy-enhanced domain (no cookies until
 * the visitor presses play) and loads lazily, so a video inside a closed FAQ
 * answer costs nothing until it is opened. Vertical videos (Shorts, phone
 * screen recordings) get a portrait frame instead of a 16:9 one, where they
 * would shrink to a sliver. The plain link underneath is there for crawlers,
 * no-JavaScript visitors and anyone who prefers the YouTube app.
 */
export async function YouTubeEmbed({ url, title }: { url: string; title?: string }) {
  const id = youtubeId(url);
  if (!id) return null;
  const { portrait, aspectRatio } = videoFrame(await youtubeVideoSize(id));

  return (
    <figure className={cn('my-6', portrait && 'mx-auto w-full max-w-72')}>
      <div className="relative w-full overflow-hidden rounded-xl border bg-black" style={{ aspectRatio }}>
        <iframe
          src={youtubeEmbedUrl(id)}
          title={title || 'Video walkthrough'}
          loading="lazy"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
          className="absolute inset-0 h-full w-full border-0"
        />
      </div>
      <figcaption className={cn('mt-2 text-sm text-muted-foreground', portrait && 'text-center')}>
        <a href={youtubeWatchUrl(id)} target="_blank" rel="noopener noreferrer" className="underline hover:no-underline">
          Watch on YouTube
        </a>
      </figcaption>
    </figure>
  );
}
