// The home page's video: the latest advertisement, in a section under "What's new".
//
// One document (cuppi_home/video) holds the video, an optional title and description, and an optional button that goes
// to a feature's page. The admin sets it in Cuppi > Home video. A switch hides the section without losing the video.
// The button stores the feature's slug, not a web address, so it can only ever lead to a feature page; the site looks
// the feature up when it draws the page and leaves the button out if that feature is gone, switched off or has no page.
//
// Whatever is stored is only read through resolveHomeVideo, which drops anything unusable, so a bad document hides the
// section and never breaks the page. No imports from the app, so the unit tests can load it from Node.

import type { VideoAspect } from './features-types.ts';
import { safeVideoUrl } from './safe-urls.ts';

export type HomeVideo = {
  /** Off hides the section, but keeps everything below so it can be switched back on. */
  enabled: boolean;
  /** The https address of an uploaded video file (it lands in our Firebase Storage), or a YouTube link. Empty when there is none. */
  url: string;
  /** Widescreen (16:9) or phone-shaped (9:16). Worked out from the file when it is chosen, and can be changed by hand. */
  aspect: VideoAspect;
  title: string;
  description: string;
  /** The feature the button opens (its slug), or empty for no button. */
  featureSlug: string;
  /** The button's words. Empty means "the feature's name" (see buttonText). */
  buttonLabel: string;
};

export const HOME_VIDEO_LIMITS = { title: 120, description: 600, buttonLabel: 30 } as const;

export const emptyHomeVideo = (): HomeVideo => ({ enabled: true, url: '', aspect: '16:9', title: '', description: '', featureSlug: '', buttonLabel: '' });

const text = (v: unknown, max: number): string => (typeof v === 'string' ? v.trim().slice(0, max) : '');

/** The stored document -> a complete, safe set of settings. Anything unrecognised falls back to the empty default. */
export function resolveHomeVideo(stored: unknown): HomeVideo {
  const s = stored && typeof stored === 'object' ? (stored as Record<string, unknown>) : {};
  const slug = text(s.featureSlug, 60);
  return {
    enabled: typeof s.enabled === 'boolean' ? s.enabled : true,
    url: safeVideoUrl(s.url) ?? '',
    aspect: s.aspect === '9:16' ? '9:16' : '16:9',
    title: text(s.title, HOME_VIDEO_LIMITS.title),
    description: text(s.description, HOME_VIDEO_LIMITS.description),
    featureSlug: /^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug) ? slug : '',
    buttonLabel: text(s.buttonLabel, HOME_VIDEO_LIMITS.buttonLabel),
  };
}

/** Whether the home page should show the section: it is switched on and there is a video to play. */
export const isShown = (v: HomeVideo): boolean => v.enabled && v.url !== '';

/** What the button says: the admin's words, or "Explore {feature name}". */
export const buttonText = (v: Pick<HomeVideo, 'buttonLabel'>, featureName: string): string => v.buttonLabel.trim() || `Explore ${featureName}`;

/** Plain-English problems with what is being saved. Empty means it can be saved. `hasVideo` counts a file chosen but not yet uploaded. */
export function validateHomeVideo(v: HomeVideo, hasVideo: boolean): string[] {
  const problems: string[] = [];
  if (v.enabled && !hasVideo) problems.push('Add a video, or switch the section off.');
  if (v.buttonLabel.trim() && !v.featureSlug) problems.push('The button needs a feature to open. Choose one, or clear the button’s words.');
  return problems;
}
