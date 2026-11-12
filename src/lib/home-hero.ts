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
  /** The small pill above the headline, e.g. "New in 1.3.0" or "Spring offer". */
  badge: string;
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
  /** 'tilt' (turned 45 degrees) or 'front' (straight on). */
  mockup: MockupKind;
  /** Mirror the phone so its screen faces the other way. */
  flip?: boolean;
  tint: FeatureTint;
};

export const homeHero: HomeHero = {
  badge: 'New in 1.3.0',
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
