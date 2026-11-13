import type { FeatureImage, FeatureTint } from './features-types';
import type { MockupKind } from './phone-mockups';

// What the home page leads with. It is deliberately a small piece of data so the
// same hero can carry the newest release today, a seasonal promo or a discount
// tomorrow, with no redesign: change this and nothing else. The admin will edit
// exactly this shape later.
//
// Wrap a word in *asterisks* in the headline to set it in italic.

export type HeroLink = { label: string; href: string; external?: boolean };

export type HomeHero = {
  headline: string;
  body: string;
  /** One quiet link under the text. The Download button lives in the menu, not here. */
  link?: HeroLink;
  /** A raw app screenshot (not a pre-made phone crop): the site puts it in a phone. */
  screenshot: FeatureImage & {
    width: number;
    height: number;
    /** The app's background colour, for any part of the screen the screenshot does not cover. */
    bg: string;
  };
  /**
   * An optional pattern laid over the hero's colour, from /public/patterns (the same
   * artwork the app uses for backgrounds). The shapes are white, so opacity is how
   * strongly they show. It eases from `centre` at `focus` to `edge` at the far corners,
   * and either can be the stronger: a quiet middle keeps the pattern off the thing you
   * want looked at, a strong one makes it glow around it.
   * `size` is the width of one tile, in px.
   */
  pattern?: {
    url: string;
    size: number;
    /** Opacity at the focus, 0 to 1. */
    centre: number;
    /** Opacity at the farthest corner, 0 to 1. */
    edge: number;
    /** Where the focus is, as a CSS position, e.g. "72% 45%". */
    focus: string;
    /** A soft light that follows the cursor: the opacity the pattern rises to under it (0 to 1). */
    spot?: number;
    /** Radius of that light, in px. */
    radius?: number;
  };
  /** 'tilt' (turned 45 degrees) or 'front' (straight on). */
  mockup: MockupKind;
  /** Mirror the phone so its screen faces the other way. */
  flip?: boolean;
  tint: FeatureTint;
  /** How long the opening shot takes, in seconds. Unset, 4.4. */
  introSeconds?: number;
};

export const homeHero: HomeHero = {
  headline: 'The *Vroom-vroom* Update',
  body: 'Keep on top of your MOT, and let Cuppi add your car’s details for you.',
  link: { label: 'Explore features', href: '/features' },
  screenshot: {
    url: '/images/hero/vroom-1-3-0.jpg',
    alt: 'The Car screen in Cuppi, showing a car with its MOT, Tax and Insurance countdowns.',
    width: 924,
    height: 1130,
    bg: '#D8EAF9',
  },
  // 5% around the phone, easing out to 30% at the corners.
  pattern: { url: '/patterns/victorianWinter.min.svg', size: 420, centre: 0.05, edge: 0.3, focus: '72% 45%', spot: 0.5, radius: 190 },
  mockup: 'tilt',
  flip: true,
  tint: 'honey',
};

/** Splits "The *Vroom-vroom* Update" into plain and italic parts. */
export function splitEmphasis(text: string): { text: string; em: boolean }[] {
  return text
    .split(/\*(.+?)\*/g)
    .map((part, i) => ({ text: part, em: i % 2 === 1 }))
    .filter((p) => p.text !== '');
}
