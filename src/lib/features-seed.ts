import { homePageFallback } from './home-page-fallback';
import type { Feature, FeatureCard, FeatureImage } from './features-types';

// The first set of feature pages. Their words and pictures are the ones already
// written for the home page (home-page-fallback.ts), regrouped one feature per
// page, so nothing here is new marketing copy. Only the short menu taglines and
// the callout lines are new, and each callout is a sentence lifted from a card.
//
// Chores, Shopping and Car exist in the app but have no website copy or
// screenshots yet, so they are listed as "soon" with no page. Siri and the
// Companion are not listed at all yet. Nothing is invented for any of them.
//
// Family life, Home and Finance fill the Features menu; "yours" (the feed,
// personalisation, privacy) fills the second menu.

type Carousel = Extract<(typeof homePageFallback.sections)[number], { kind: 'carousel' }>;
type ImageSection = Extract<(typeof homePageFallback.sections)[number], { kind: 'image' }>;

const carousel = (id: string): Carousel => {
  const s = homePageFallback.sections.find((x) => x.id === id);
  if (!s || s.kind !== 'carousel') throw new Error(`features-seed: no carousel section "${id}"`);
  return s;
};
const imageSection = (id: string): ImageSection => {
  const s = homePageFallback.sections.find((x) => x.id === id);
  if (!s || s.kind !== 'image') throw new Error(`features-seed: no image section "${id}"`);
  return s;
};
// The one lifestyle photo in the set (the phone on the kitchen table). Every other
// image is a transparent phone crop.
const PHOTOS = ['homeos-sheet-20.webp'];
const fitOf = (image: FeatureImage): FeatureImage =>
  PHOTOS.some((name) => image.url.includes(name)) ? { ...image, fit: 'photo' } : image;

const toCard = (c: Carousel['cards'][number]): FeatureCard => ({
  title: c.title,
  body: c.description,
  image: fitOf(c.image),
});

const homeFeed = carousel('welcome-home');
const birthdays = carousel('birthdays');
const binDay = carousel('bin-day');
const pets = carousel('pets');
const receipts = carousel('receipts');
const budget = carousel('budget');
const personalisation = imageSection('personalisation');
const security = imageSection('security');
const values = imageSection('values');

const firstImage = (c: Carousel): FeatureImage => fitOf(c.cards[0].image);

export const featuresSeed: Feature[] = [
  {
    slug: 'home-feed',
    name: 'Home Feed',
    tagline: 'Your household’s private feed',
    icon: 'home',
    tint: 'honey',
    group: 'yours',
    status: 'live',
    order: 10,
    tile: 'amber',
    hero: { headline: homeFeed.heading, intro: homeFeed.intro, image: firstImage(homeFeed) },
    blocks: [
      { id: 'hf-cards', type: 'cards', title: 'Social media, but make it home', cards: homeFeed.cards.map(toCard) },
      {
        id: 'hf-callout',
        type: 'callout',
        tint: 'honey',
        title: 'No advertisements, no tracking, just bringing calm into the everyday chaos.',
      },
    ],
  },
  {
    slug: 'pets',
    name: 'Pets',
    tagline: 'Health, meds and appointments',
    icon: 'paw',
    tint: 'sky',
    group: 'family',
    status: 'live',
    order: 20,
    tile: 'green',
    hero: { headline: pets.heading, intro: pets.intro, image: firstImage(pets) },
    blocks: [
      {
        id: 'pets-1',
        type: 'showcase',
        side: 'right',
        tint: 'sky',
        title: pets.cards[1].title,
        body: pets.cards[1].description,
        image: pets.cards[1].image,
      },
      { id: 'pets-cards', type: 'cards', title: 'Never missed', cards: pets.cards.slice(2).map(toCard) },
    ],
  },
  {
    slug: 'celebrations',
    name: 'Celebrations',
    tagline: 'Birthdays and big days, never missed',
    icon: 'cake',
    tint: 'clay',
    group: 'family',
    status: 'live',
    order: 10,
    tile: 'pink',
    hero: { headline: birthdays.heading, intro: birthdays.intro, image: firstImage(birthdays) },
    blocks: [
      {
        id: 'bd-1',
        type: 'showcase',
        side: 'right',
        tint: 'clay',
        title: birthdays.cards[1].title,
        body: birthdays.cards[1].description,
        image: birthdays.cards[1].image,
      },
      {
        id: 'bd-2',
        type: 'showcase',
        side: 'left',
        tint: 'honey',
        title: birthdays.cards[2].title,
        body: birthdays.cards[2].description,
        image: birthdays.cards[2].image,
      },
      {
        id: 'bd-callout',
        type: 'callout',
        tint: 'clay',
        title: 'Trade the last-minute panic for a bit of home baking.',
      },
    ],
  },
  {
    slug: 'bin-day',
    name: 'Bin Day',
    tagline: 'A gentle nudge the night before',
    icon: 'bin',
    tint: 'moss',
    group: 'home',
    status: 'live',
    order: 30,
    tile: 'blue',
    hero: { headline: binDay.heading, intro: binDay.intro, image: firstImage(binDay) },
    blocks: [
      {
        id: 'bin-1',
        type: 'showcase',
        side: 'right',
        tint: 'moss',
        eyebrow: 'Preview',
        title: binDay.cards[1].title,
        body: binDay.cards[1].description,
        image: binDay.cards[1].image,
      },
      {
        id: 'bin-callout',
        type: 'callout',
        tint: 'moss',
        title: 'Set it once and relax. We’ll send a gentle notification at 6.00 pm the evening before.',
      },
    ],
  },
  {
    slug: 'receipts',
    name: 'Receipts',
    tagline: 'Your shopping, itemised',
    icon: 'receipt',
    tint: 'honey',
    group: 'finance',
    status: 'live',
    order: 40,
    iconUrl: '/icons/receiptAppIcon.png',
    tile: 'amber',
    hero: { headline: receipts.heading, intro: receipts.intro, image: firstImage(receipts) },
    blocks: [
      {
        id: 'rc-cards',
        type: 'cards',
        title: 'From a quick total to the last apple',
        cards: receipts.cards.slice(1).map(toCard),
        footnotes: receipts.footnotes,
      },
    ],
  },
  {
    slug: 'budget',
    name: 'Budget',
    tagline: 'Budgets built for Britain',
    icon: 'wallet',
    tint: 'lake',
    group: 'finance',
    status: 'live',
    order: 20,
    tile: 'amber',
    hero: { headline: budget.heading, intro: budget.intro, image: firstImage(budget) },
    blocks: [
      {
        id: 'bg-1',
        type: 'showcase',
        side: 'right',
        tint: 'sky',
        title: budget.cards[1].title,
        body: budget.cards[1].description,
        image: budget.cards[1].image,
      },
      {
        id: 'bg-2',
        type: 'showcase',
        side: 'left',
        tint: 'moss',
        title: budget.cards[2].title,
        body: budget.cards[2].description,
        image: budget.cards[2].image,
      },
    ],
  },
  {
    slug: 'personalisation',
    name: 'Personalisation',
    tagline: 'Colours, full of life',
    icon: 'palette',
    tint: 'clay',
    group: 'yours',
    status: 'live',
    order: 20,
    tile: 'pink',
    hero: {
      headline: personalisation.heading,
      intro: personalisation.intro,
      image: personalisation.image,
      imageStyle: 'wide',
    },
    blocks: [
      { id: 'pz-callout', type: 'callout', tint: 'honey', title: 'Your Home should reflect your personality.' },
    ],
  },
  {
    slug: 'privacy',
    name: 'Privacy & Security',
    tagline: 'Your home, your data',
    icon: 'shield',
    tint: 'lake',
    group: 'yours',
    status: 'live',
    order: 30,
    tile: 'blue',
    hero: {
      headline: security.heading,
      intro: security.intro,
      image: { url: security.image.url, alt: security.image.alt },
    },
    blocks: [
      {
        id: 'sec-points',
        type: 'points',
        title: values.heading,
        items: [
          { title: 'We don’t track you', body: 'We aren’t interested in following your movements or selling your habits.' },
          { title: 'We never push ads', body: 'Home life is private and personal. Nothing here is for sale.' },
          { title: 'Stays on your device', body: 'Biometric logins stay on your device, and encrypted backups keep your household records safe.' },
          { title: 'Only what’s needed', body: 'We only collect the absolute minimum amount of information required to keep your account running smoothly.' },
        ],
      },
    ],
  },

  // In the app, with an icon, but no website copy or screenshots yet. They show in
  // the menus as "Soon" and have no page until the admin adds one.
  {
    slug: 'chores',
    name: 'Chores',
    tagline: 'Coming soon',
    icon: 'sparkles',
    tile: 'blue',
    tint: 'sky',
    group: 'family',
    status: 'soon',
    order: 30,
  },
  {
    slug: 'shopping',
    name: 'Shopping',
    tagline: 'Coming soon',
    icon: 'sparkles',
    tile: 'green',
    tint: 'moss',
    group: 'home',
    status: 'soon',
    order: 10,
  },
  {
    slug: 'car',
    name: 'Car',
    tagline: 'Coming soon',
    icon: 'sparkles',
    tile: 'blue',
    tint: 'sky',
    group: 'home',
    status: 'soon',
    order: 50,
  },
];
