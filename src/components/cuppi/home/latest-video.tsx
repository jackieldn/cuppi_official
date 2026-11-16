import { cn } from '@/lib/utils';
import { ActionButton } from '@/components/cuppi/action-button';
import { VideoPlayer } from '@/components/cuppi/blocks/video-player';
import { Reveal } from '@/components/ui/reveal';
import { getFeature } from '@/lib/features';
import { getHomeVideo } from '@/lib/cuppi-site-data';
import { buttonText, isShown } from '@/lib/home-video';

/**
 * The latest advertisement, under "What's new" on the home page (set in the admin: Cuppi > Home video; see
 * src/lib/home-video.ts). It shows nothing at all when there is no video or the section is switched off.
 *
 * Words and a button sit beside the video when there are any; with none, the video stands alone. A widescreen
 * video fills its space like a picture. A phone-shaped one (9:16) would be a sliver there, so it stands in a
 * colour panel at a sensible height instead, as on the feature pages.
 */
export async function LatestVideo() {
  const settings = await getHomeVideo();
  if (!isShown(settings)) return null;

  // The button leads to a feature's page. A feature that has since been removed, switched off or had its page
  // taken away just means no button, never a dead link.
  const feature = settings.featureSlug ? await getFeature(settings.featureSlug) : null;
  const hasWords = !!(settings.title || settings.description || feature);
  const tall = settings.aspect === '9:16';
  const video = { url: settings.url, aspect: settings.aspect, label: settings.title || 'Cuppi advert' };

  const player = tall ? (
    <div className="flex items-center justify-center rounded-[1.5rem] bg-cuppi-honey-soft px-6 py-8 sm:py-10">
      <div className="relative w-full max-w-[17rem] overflow-hidden rounded-[1.75rem] bg-cuppi-espresso sm:max-w-[19rem]" style={{ aspectRatio: '9 / 16', maxHeight: '75vh' }}>
        <VideoPlayer video={video} />
      </div>
    </div>
  ) : (
    <div className="relative w-full overflow-hidden rounded-[1.5rem] bg-cuppi-espresso" style={{ aspectRatio: '16 / 9' }}>
      <VideoPlayer video={video} />
    </div>
  );

  return (
    <section id="latest-video" aria-label={settings.title || 'Latest from Cuppi'} className="mt-16 w-full max-w-6xl scroll-mt-24 px-2 sm:px-4">
      <Reveal>
        <div className={cn('rounded-[2rem] bg-cuppi-card p-3', hasWords && (tall ? 'grid items-center gap-2 md:grid-cols-2' : 'grid items-center gap-2 md:grid-cols-[1.5fr_1fr]'))}>
          {player}
          {hasWords && (
            <div className="flex flex-col items-start gap-4 px-4 py-6 sm:px-8 md:py-8">
              {settings.title && <h2 className="font-headline text-3xl leading-tight tracking-tight sm:text-4xl">{settings.title}</h2>}
              {settings.description && <p className="whitespace-pre-line text-lg leading-relaxed text-cuppi-ink-soft">{settings.description}</p>}
              {feature && <ActionButton href={`/features/${feature.slug}`}>{buttonText(settings, feature.name)}</ActionButton>}
            </div>
          )}
        </div>
      </Reveal>
    </section>
  );
}
