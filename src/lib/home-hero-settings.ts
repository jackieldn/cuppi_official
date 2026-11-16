// The home page hero as the admin sets it. One document (cuppi_home/hero) holds up to five heroes
// (`heroes`), each with its template, words and button, colour, pattern and phone; with more than one
// the home page turns them into a slideshow. Before there could be several, the document held one
// hero's fields at the top level: that is still read, as a list of one. Whatever is stored is only ever
// read through resolveHeroSettings, which fills gaps from the defaults, clamps every number and
// drops anything unsafe, so a bad document can make the hero look plain but never break the page.
//
// The picture inside the phone is optional: with none saved it is the one in home-hero.ts (the original).

import { readImage } from './feature-sections.ts';
import type { FeatureImage, FeatureShot, FeatureTint, PairArrangement, PhoneView } from './features-types';
import { homeHero, type HomeHero } from './home-hero.ts';
import { MAX_LABEL, safeHref } from './menu-settings.ts';
import { PATTERNS, type PatternName } from './patterns.ts';
import { safeImageUrl } from './safe-urls.ts';
import type { MockupKind } from './phone-mockups';

export type HeroTemplate = 'split' | 'split-reverse' | 'centred';

export const HERO_TEMPLATES: {
  key: HeroTemplate;
  name: string;
  blurb: string;
  /** Where the phone sits in the block, as a CSS position: the pattern stays quiet around it. */
  focus: string;
  /** Which way the phone's screen faces to look towards the words, in a template that has them to one side. */
  facing?: Facing;
}[] = [
  { key: 'split', name: 'Split', blurb: 'Words on the left, phone on the right. The original.', focus: '72% 45%', facing: 'left' },
  { key: 'split-reverse', name: 'Phone left', blurb: 'Phone on the left, words on the right.', focus: '28% 45%', facing: 'right' },
  { key: 'centred', name: 'Centred', blurb: 'Words in the middle, the phone rising from the bottom edge.', focus: '50% 82%' },
];

/** Which way the phone's screen faces. Only the 45 degree phone has a side; a straight-on one looks the same either way. */
export type Facing = 'left' | 'right';

export const TINTS_IN_ORDER: FeatureTint[] = ['honey', 'sky', 'moss', 'clay', 'lake'];
export const PATTERN_NAMES = Object.keys(PATTERNS) as PatternName[];

/** How many heroes the home page can rotate through. */
export const MAX_HEROES = 5;

/** How long each hero stays up before the next one, in seconds. */
export const HERO_HOLD_SECONDS = 7;

export const LIMITS = {
  headline: 90,
  body: 220,
  label: MAX_LABEL,
  size: { min: 200, max: 800 },
  /** Opacity of the pattern, as 0 to 1. Above 0.6 it stops being a pattern and becomes a texture. */
  strength: { min: 0, max: 0.6 },
  /** The opening shot, in seconds. */
  intro: { min: 1, max: 10 },
} as const;

/**
 * The screenshot in the hero's phone, as uploaded in the admin. Like a feature page's "screenshot in a phone" it can show the top or
 * the bottom of the screen (`view`), be joined by a second screenshot in a second phone (`second`, set out as `arrange`), or slide
 * to the other end of the screenshot under the cursor (`slide`, one phone only). The phone's angle and which way it faces are the
 * hero's own settings (`phone`, `facing`).
 */
export type HeroShot = {
  url: string;
  alt: string;
  /** Its real size, so the phone is laid out before the picture loads. */
  width: number;
  height: number;
  /** The app's background colour, for any part of the screen the screenshot does not cover. */
  bg: string;
  view?: PhoneView;
  second?: FeatureShot;
  arrange?: PairArrangement;
  slide?: boolean;
};

/** What a screenshot is assumed to measure when its size was not recorded (a current iPhone screenshot). */
const GUESS = { width: 1170, height: 2532 };

export type HeroSettings = {
  template: HeroTemplate;
  /** Wrap a word in *asterisks* to set it in italic. */
  headline: string;
  body: string;
  button: { label: string; href: string; visible: boolean };
  tint: FeatureTint;
  /** A pattern from /public/patterns, or 'none'. */
  pattern: PatternName | 'none';
  /** Width of one pattern tile, in px. */
  patternSize: number;
  /** Pattern opacity around the phone (0 to 1). */
  patternCentre: number;
  /** Pattern opacity at the far corners (0 to 1). */
  patternEdge: number;
  /** A soft light that follows the cursor. */
  cursorGlow: boolean;
  phone: MockupKind;
  facing: Facing;
  /** The screenshot shown in the phone, or null for the original one in home-hero.ts. */
  screenshot: HeroShot | null;
  /** How long the opening shot takes, in seconds. */
  introSeconds: number;
};

const defaultPattern = (): PatternName => (PATTERN_NAMES.find((n) => PATTERNS[n] === homeHero.pattern?.url) ?? 'victorianWinter');

/** What the hero was before it was editable. Used until the admin saves anything, and whenever the database cannot be read. */
export function defaultHeroSettings(): HeroSettings {
  const p = homeHero.pattern;
  return {
    template: 'split',
    headline: homeHero.headline,
    body: homeHero.body,
    button: { label: homeHero.link?.label ?? 'Explore features', href: homeHero.link?.href ?? '/features', visible: !!homeHero.link },
    tint: homeHero.tint,
    pattern: p ? defaultPattern() : 'none',
    patternSize: p?.size ?? 420,
    patternCentre: p?.centre ?? 0.05,
    patternEdge: p?.edge ?? 0.3,
    cursorGlow: (p?.spot ?? 0) > 0,
    phone: homeHero.mockup,
    facing: homeHero.flip ? 'left' : 'right',
    screenshot: null,
    introSeconds: 4.4,
  };
}

/** A starting point for a hero added in the admin: the original look, with words that ask to be replaced. */
export function newHeroSettings(): HeroSettings {
  return { ...defaultHeroSettings(), headline: 'Your new *headline*', body: 'Say a little more here.' };
}

const text = (v: unknown, max: number, fallback: string): string => {
  const t = typeof v === 'string' ? v.trim().slice(0, max) : '';
  return t || fallback;
};
const oneOf = <T extends string>(v: unknown, allowed: readonly T[], fallback: T): T => (allowed.includes(v as T) ? (v as T) : fallback);
const num = (v: unknown, min: number, max: number, fallback: number): number =>
  typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : fallback;

/** A stored screenshot -> a safe one, or null (the original) when its address is not one the site can show. */
function readShot(v: unknown): HeroShot | null {
  const r = v && typeof v === 'object' ? (v as Record<string, unknown>) : null;
  // The same reader a feature page's framed phones use, so an address, size, view, second phone and colour are all checked alike.
  const i: FeatureImage | null = r ? readImage({ ...r, fit: 'frame' }) : null;
  if (!i) return null;
  return {
    url: i.url,
    alt: i.alt || 'The Cuppi app',
    width: i.width ?? GUESS.width,
    height: i.height ?? GUESS.height,
    bg: i.bg ?? '#FFFFFF',
    ...(i.view ? { view: i.view } : {}),
    ...(i.second ? { second: i.second } : {}),
    ...(i.arrange ? { arrange: i.arrange } : {}),
    ...(i.slide ? { slide: true } : {}),
  };
}

/** Stored document -> complete, safe settings. Every field falls back on its own, so one bad field costs only itself. */
export function resolveHeroSettings(stored: unknown): HeroSettings {
  const d = defaultHeroSettings();
  const s = stored && typeof stored === 'object' ? (stored as Record<string, unknown>) : {};
  const b = s.button && typeof s.button === 'object' ? (s.button as Record<string, unknown>) : {};
  return {
    template: oneOf(s.template, HERO_TEMPLATES.map((t) => t.key), d.template),
    headline: text(s.headline, LIMITS.headline, d.headline),
    // The words under the headline may be empty on purpose; only a non-string means "use the default".
    body: typeof s.body === 'string' ? s.body.trim().slice(0, LIMITS.body) : d.body,
    button: {
      label: text(b.label, LIMITS.label, d.button.label),
      href: safeHref(b.href) ?? d.button.href,
      visible: typeof b.visible === 'boolean' ? b.visible : d.button.visible,
    },
    tint: oneOf(s.tint, TINTS_IN_ORDER, d.tint),
    pattern: oneOf(s.pattern, [...PATTERN_NAMES, 'none' as const], d.pattern),
    patternSize: Math.round(num(s.patternSize, LIMITS.size.min, LIMITS.size.max, d.patternSize)),
    patternCentre: num(s.patternCentre, LIMITS.strength.min, LIMITS.strength.max, d.patternCentre),
    patternEdge: num(s.patternEdge, LIMITS.strength.min, LIMITS.strength.max, d.patternEdge),
    cursorGlow: typeof s.cursorGlow === 'boolean' ? s.cursorGlow : d.cursorGlow,
    phone: oneOf(s.phone, ['tilt', 'front'] as const, d.phone),
    facing: oneOf(s.facing, ['left', 'right'] as const, d.facing),
    screenshot: readShot(s.screenshot),
    introSeconds: Math.round(num(s.introSeconds, LIMITS.intro.min, LIMITS.intro.max, d.introSeconds) * 10) / 10,
  };
}

/**
 * Stored document -> one to five safe heroes. A document with a `heroes` list is read entry by entry
 * (anything that is not an object is skipped, and any past the fifth is dropped); one without is the older
 * single hero, kept as a list of one; nothing at all is the original hero.
 */
export function resolveHeroList(stored: unknown): HeroSettings[] {
  const s = stored && typeof stored === 'object' ? (stored as Record<string, unknown>) : null;
  const list = s && Array.isArray(s.heroes) ? s.heroes.filter((h) => h && typeof h === 'object' && !Array.isArray(h)) : [];
  if (list.length === 0) return [resolveHeroSettings(stored)];
  return list.slice(0, MAX_HEROES).map((h) => resolveHeroSettings(h));
}

/** Plain-English problems with settings being saved (empty when fine). The admin form shows these. */
export function validateHeroSettings(h: HeroSettings): string[] {
  const problems: string[] = [];
  if (!h.headline.trim()) problems.push('The hero needs a headline.');
  if (h.screenshot && !h.screenshot.url) problems.push('The phone screenshot has no picture. Choose one, or go back to the original.');
  if (h.screenshot?.second && !h.screenshot.second.url) problems.push('Add the second phone’s screenshot, or switch to one phone.');
  if (h.button.visible) {
    if (!h.button.label.trim()) problems.push('The button needs a name (or switch it off).');
    if (!safeHref(h.button.href)) problems.push('The button needs an address that starts with / (a page on this site) or https://.');
  }
  return problems;
}

/** The problems across every hero, each with the position (from 0) of the hero it belongs to, and naming that hero when there is more than one. */
export function validateHeroList(list: HeroSettings[]): { index: number; problem: string }[] {
  if (list.length === 0) return [{ index: 0, problem: 'There needs to be at least one hero.' }];
  if (list.length > MAX_HEROES) return [{ index: MAX_HEROES, problem: `There can be at most ${MAX_HEROES} heroes.` }];
  return list.flatMap((h, index) => validateHeroSettings(h).map((p) => ({ index, problem: list.length > 1 ? `Hero ${index + 1}: ${p}` : p })));
}

/** Settings -> what the hero component draws. */
export function buildHero(h: HeroSettings): HomeHero & { template: HeroTemplate } {
  const template = HERO_TEMPLATES.find((t) => t.key === h.template) ?? HERO_TEMPLATES[0];
  return {
    ...homeHero,
    template: template.key,
    headline: h.headline,
    body: h.body,
    link: h.button.visible ? { label: h.button.label, href: h.button.href } : undefined,
    tint: h.tint,
    pattern:
      h.pattern === 'none'
        ? undefined
        : {
            url: PATTERNS[h.pattern],
            size: h.patternSize,
            centre: h.patternCentre,
            edge: h.patternEdge,
            focus: template.focus,
            spot: h.cursorGlow ? 0.5 : 0,
            radius: 190,
          },
    screenshot: h.screenshot ?? homeHero.screenshot,
    mockup: h.phone,
    flip: h.phone === 'tilt' && h.facing === 'left',
    introSeconds: h.introSeconds,
  };
}
