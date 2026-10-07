// The shape of the Cuppi home page, however it was loaded: from the "Home page"
// document in Sanity, or from the built-in copy in home-page-fallback.ts.

export type HomeImage = { url: string; alt: string };

export type HomeCard = {
  title: string;
  description: string;
  image: HomeImage;
};

type HomeSectionBase = {
  /** Anchor used by the section's link in the nav chips, e.g. "bin-day". */
  id: string;
  /** Small label above the heading. Also the text of the nav chip. */
  eyebrow: string;
  heading: string;
  intro: string;
};

export type HomeSection =
  // Heading and intro, then a swipeable row of image + text cards.
  | (HomeSectionBase & { kind: 'carousel'; cards: HomeCard[]; footnotes: string[] })
  // Heading and intro beside one large image.
  | (HomeSectionBase & { kind: 'image'; image: HomeImage });

export type HomePage = {
  hero: { line1: string; line2: string; image: HomeImage };
  sections: HomeSection[];
};
