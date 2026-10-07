import { sanityClient } from '@/lib/sanity-client';
import { homePageFallback } from '@/lib/home-page-fallback';
import { normalizeHomePage } from '@/lib/home-page-normalize';
import type { HomePage } from '@/lib/home-page-types';

export type { HomeCard, HomeImage, HomePage, HomeSection } from '@/lib/home-page-types';

// The published "Home page" document in Sanity. Images come back as plain URLs
// so the page needs no Sanity image helpers. Draft documents are never
// returned (the client reads the published perspective).
const HOME_PAGE_QUERY = `*[_type == "homePage"][0]{
  "hero": {
    "line1": hero.line1,
    "line2": hero.line2,
    "imageUrl": hero.image.asset->url,
    "imageAlt": hero.image.alt
  },
  "sections": sections[]{
    "kind": select(_type == "carouselSection" => "carousel", _type == "imageSection" => "image"),
    "id": anchor.current,
    eyebrow,
    heading,
    intro,
    footnotes,
    "cards": cards[]{
      title,
      description,
      "imageUrl": image.asset->url,
      "imageAlt": image.alt
    },
    "imageUrl": image.asset->url,
    "imageAlt": image.alt
  }
}`;

/** The home page content: from Sanity when it is published there, else the built-in copy. */
export async function getHomePage(): Promise<HomePage> {
  try {
    const raw = await sanityClient.fetch(HOME_PAGE_QUERY);
    const page = raw ? normalizeHomePage(raw) : null;
    if (page) return page;
    if (raw) console.error('Home page in Sanity is incomplete; using the built-in copy.');
  } catch (error) {
    console.error('Failed to load the home page from Sanity; using the built-in copy:', error);
  }
  return homePageFallback;
}
