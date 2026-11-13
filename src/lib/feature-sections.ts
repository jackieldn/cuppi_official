// The sections of a feature page, as the admin builds them: the templates on offer, a blank
// section for each, and the two checks around the database.
//
//   resolveBlocks    stored -> safe. Runs on everything read back, so a bad section is dropped
//                    (or a bad field falls back) and can never break the page.
//   validateSections draft -> plain-English problems, run when the admin presses Save.
//
// Only types are imported from features-types (it imports this file), so there is no cycle.

import type { FeatureBlock, FeatureImage, FeatureShot, FeatureTint, FeatureVideo, VideoAspect } from './features-types.ts';
import { disclaimerIds, hasDisclaimer } from './disclaimers.ts';
import { safeImageUrl, safeVideoUrl } from './safe-urls.ts';

export type SectionType = FeatureBlock['type'];

/** The templates, in the order the picker shows them. */
export const SECTION_TEMPLATES: { type: SectionType; name: string; blurb: string }[] = [
  { type: 'showcase', name: 'Words and phone', blurb: 'Text on one side, a phone rising out of a colour card on the other.' },
  { type: 'tabs', name: 'Explainer tabs', blurb: 'A list of short topics. Picking one swaps the picture beside it.' },
  { type: 'banner', name: 'Big picture', blurb: 'A headline over one full-width picture.' },
  { type: 'video', name: 'Video', blurb: 'A tutorial or an ad. Widescreen, or phone-shaped (9:16).' },
  { type: 'cards', name: 'Phone cards', blurb: 'A swipeable row of cards, each with a phone and a few lines.' },
  { type: 'callout', name: 'Big sentence', blurb: 'One warm sentence on a colour band. The page’s deep breath.' },
  { type: 'points', name: 'Reasons', blurb: 'Short promises in a grid, no pictures.' },
];

export const sectionName = (type: SectionType): string => SECTION_TEMPLATES.find((t) => t.type === type)?.name ?? type;

export const SECTION_TINTS: FeatureTint[] = ['honey', 'sky', 'moss', 'clay', 'lake'];
export const VIDEO_ASPECTS: VideoAspect[] = ['16:9', '9:16'];

export const SECTION_LIMITS = {
  sections: 30,
  /** Cards, tabs and reasons in one section. */
  items: 8,
  eyebrow: 40,
  title: 160,
  /** The body of an item or section. */
  body: 1200,
  intro: 400,
  alt: 200,
  note: 300,
  notes: 8,
  label: 160,
} as const;

const clean = (value: string): string => value.trim();
const EMPTY_IMAGE: FeatureImage = { url: '', alt: '' };
/** A new picture slot for a phone screenshot: the site puts it in an iPhone. */
const FRAMED: FeatureImage = { url: '', alt: '', fit: 'frame', frame: 'front' };

const randomId = (): string => `s-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

/** A blank section of the given template, ready to fill in. Its picture and video are empty until the admin adds them. */
export function newSection(type: SectionType, id: string = randomId()): FeatureBlock {
  switch (type) {
    case 'showcase':
      return { id, type, title: '', body: '', image: { ...FRAMED }, side: 'left', tint: 'honey' };
    case 'cards':
      return { id, type, title: '', cards: [{ title: '', body: '', image: { ...FRAMED } }] };
    case 'callout':
      return { id, type, title: '', tint: 'honey' };
    case 'points':
      return { id, type, items: [{ title: '', body: '' }] };
    case 'tabs':
      return {
        id,
        type,
        title: '',
        items: [
          { title: '', body: '', image: { ...FRAMED } },
          { title: '', body: '', image: { ...FRAMED } },
        ],
        side: 'left',
        tint: 'sky',
      };
    case 'banner':
      return { id, type, title: '', image: { ...EMPTY_IMAGE, fit: 'photo' }, tint: 'honey' };
    case 'video':
      return { id, type, title: '', layout: 'full', side: 'left', tint: 'honey', video: { url: '', aspect: '16:9' } };
  }
}

/** A copy of a section with a fresh id, for Duplicate. */
export const copySection = (block: FeatureBlock): FeatureBlock => ({ ...JSON.parse(JSON.stringify(block)), id: randomId() });

// ---------------------------------------------------------------------------
// Reading what was stored
// ---------------------------------------------------------------------------

const obj = (v: unknown): Record<string, unknown> | null => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null);
const text = (v: unknown, max: number): string | undefined => (typeof v === 'string' && v.trim() ? clean(v).slice(0, max) : undefined);
const oneOf = <T extends string>(v: unknown, allowed: readonly T[], fallback: T): T => (allowed.includes(v as T) ? (v as T) : fallback);

const HEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;
const dimension = (v: unknown): number | undefined => (typeof v === 'number' && Number.isFinite(v) && v >= 1 && v <= 20000 ? Math.round(v) : undefined);

function readShot(v: unknown): FeatureShot | null {
  const r = obj(v);
  const url = safeImageUrl(r?.url);
  if (!r || !url) return null;
  const width = dimension(r.width);
  const height = dimension(r.height);
  return { url, alt: text(r.alt, SECTION_LIMITS.alt) ?? '', ...(width && height ? { width, height } : {}), ...(r.view === 'bottom' ? { view: 'bottom' as const } : {}) };
}

function readImage(v: unknown): FeatureImage | null {
  const shot = readShot(v);
  const r = obj(v);
  if (!shot || !r) return null;
  const fit = r.fit === 'photo' || r.fit === 'contain' || r.fit === 'frame' ? r.fit : undefined;
  if (fit !== 'frame') {
    // The view belongs to phone frames only.
    const { view: _view, ...plain } = shot;
    return { ...plain, ...(fit ? { fit } : {}) };
  }
  const second = readShot(r.second);
  return {
    ...shot,
    fit,
    frame: r.frame === 'tilt' ? 'tilt' : 'front',
    ...(r.flip === true ? { flip: true } : {}),
    ...(typeof r.bg === 'string' && HEX.test(r.bg.trim()) ? { bg: r.bg.trim() } : {}),
    ...(second ? { second } : {}),
    ...(!second && r.slide === true ? { slide: true } : {}),
    ...(second && (r.arrange === 'higher' || r.arrange === 'level') ? { arrange: r.arrange } : {}),
  };
}

function readVideo(v: unknown): FeatureVideo | null {
  const r = obj(v);
  const url = safeVideoUrl(r?.url);
  if (!r || !url) return null;
  const poster = safeImageUrl(r.poster);
  const label = text(r.label, SECTION_LIMITS.label);
  return { url, aspect: oneOf(r.aspect, VIDEO_ASPECTS, '16:9'), ...(poster ? { poster } : {}), ...(label ? { label } : {}) };
}

const list = (v: unknown): unknown[] => (Array.isArray(v) ? v.slice(0, SECTION_LIMITS.items) : []);

function readBlock(raw: unknown, id: string): FeatureBlock | null {
  const r = obj(raw);
  if (!r) return null;
  const title = text(r.title, SECTION_LIMITS.title);
  const tint = oneOf(r.tint, SECTION_TINTS, 'honey');
  const intro = text(r.intro, SECTION_LIMITS.intro);
  switch (r.type) {
    case 'showcase': {
      const image = readImage(r.image);
      if (!title || !image) return null;
      const eyebrow = text(r.eyebrow, SECTION_LIMITS.eyebrow);
      return { id, type: 'showcase', ...(eyebrow ? { eyebrow } : {}), title, body: text(r.body, SECTION_LIMITS.body) ?? '', image, side: oneOf(r.side, ['left', 'right'] as const, 'left'), tint };
    }
    case 'cards': {
      const cards = list(r.cards).flatMap((c) => {
        const o = obj(c);
        const image = readImage(o?.image);
        const t = text(o?.title, SECTION_LIMITS.title);
        return o && image && t ? [{ title: t, body: text(o.body, SECTION_LIMITS.body) ?? '', image }] : [];
      });
      if (!title || cards.length === 0) return null;
      const footnotes = (Array.isArray(r.footnotes) ? r.footnotes : []).flatMap((n) => text(n, SECTION_LIMITS.note) ?? []).slice(0, SECTION_LIMITS.notes);
      return { id, type: 'cards', title, ...(intro ? { intro } : {}), cards, ...(footnotes.length ? { footnotes } : {}) };
    }
    case 'callout': {
      if (!title) return null;
      const body = text(r.body, SECTION_LIMITS.intro);
      return { id, type: 'callout', title, ...(body ? { body } : {}), tint };
    }
    case 'points': {
      const items = list(r.items).flatMap((i) => {
        const o = obj(i);
        const t = text(o?.title, SECTION_LIMITS.title);
        return o && t ? [{ title: t, body: text(o.body, SECTION_LIMITS.body) ?? '' }] : [];
      });
      return items.length === 0 ? null : { id, type: 'points', ...(title ? { title } : {}), items };
    }
    case 'tabs': {
      const items = list(r.items).flatMap((i) => {
        const o = obj(i);
        const image = readImage(o?.image);
        const t = text(o?.title, SECTION_LIMITS.title);
        return o && image && t ? [{ title: t, body: text(o.body, SECTION_LIMITS.body) ?? '', image }] : [];
      });
      if (items.length === 0) return null;
      return { id, type: 'tabs', ...(title ? { title } : {}), ...(intro ? { intro } : {}), items, side: oneOf(r.side, ['left', 'right'] as const, 'left'), tint };
    }
    case 'banner': {
      const image = readImage(r.image);
      if (!image) return null;
      return { id, type: 'banner', ...(title ? { title } : {}), ...(intro ? { intro } : {}), image, tint };
    }
    case 'video': {
      const video = readVideo(r.video);
      if (!video) return null;
      const eyebrow = text(r.eyebrow, SECTION_LIMITS.eyebrow);
      const body = text(r.body, SECTION_LIMITS.body);
      return {
        id,
        type: 'video',
        ...(eyebrow ? { eyebrow } : {}),
        ...(title ? { title } : {}),
        ...(body ? { body } : {}),
        layout: oneOf(r.layout, ['full', 'split'] as const, 'full'),
        side: oneOf(r.side, ['left', 'right'] as const, 'left'),
        tint,
        video,
      };
    }
    default:
      return null;
  }
}

/**
 * Stored sections -> sections that are safe to draw. Each one is checked on its own: an unknown
 * template, a section missing what it needs, an address that is not allowed, all drop that section
 * (or that one item) and nothing else. Ids are kept if usable and made unique.
 */
export function resolveBlocks(stored: unknown): FeatureBlock[] {
  if (!Array.isArray(stored)) return [];
  const seen = new Set<string>();
  const out: FeatureBlock[] = [];
  stored.slice(0, SECTION_LIMITS.sections).forEach((raw, index) => {
    const wanted = text(obj(raw)?.id, 64);
    let id = wanted && !seen.has(wanted) ? wanted : `section-${index + 1}`;
    while (seen.has(id)) id += '-x';
    const block = readBlock(raw, id);
    if (block) {
      seen.add(id);
      out.push(block);
    }
  });
  return out;
}

// ---------------------------------------------------------------------------
// Checking a draft before it is saved
// ---------------------------------------------------------------------------

/**
 * Every piece of words in a section that can carry a disclaimer tag. The label chip and a tab's title cannot (a chip is
 * too small, and a tab's title is a button), so they are listed apart.
 */
function sectionWords(b: FeatureBlock): { words: string[]; noTags: string[] } {
  switch (b.type) {
    case 'showcase':
      return { words: [b.title, b.body], noTags: [b.eyebrow ?? ''] };
    case 'cards':
      return { words: [b.title, b.intro ?? '', ...(b.footnotes ?? []), ...b.cards.flatMap((c) => [c.title, c.body])], noTags: [] };
    case 'callout':
      return { words: [b.title, b.body ?? ''], noTags: [] };
    case 'points':
      return { words: [b.title ?? '', ...b.items.flatMap((i) => [i.title, i.body])], noTags: [] };
    case 'tabs':
      return { words: [b.title ?? '', b.intro ?? '', ...b.items.map((i) => i.body)], noTags: b.items.map((i) => i.title) };
    case 'banner':
      return { words: [b.title ?? '', b.intro ?? ''], noTags: [] };
    case 'video':
      return { words: [b.title ?? '', b.body ?? ''], noTags: [b.eyebrow ?? ''] };
  }
}

/**
 * What is missing from each section, as sentences the admin can act on. Empty means it can be saved.
 * `knownDisclaimers`, when given, are the ids of the disclaimers that exist: a tag for any other is reported.
 */
export function validateSections(blocks: FeatureBlock[], knownDisclaimers?: readonly string[]): string[] {
  const problems: string[] = [];
  blocks.forEach((b, n) => {
    const at = (what: string) => problems.push(`Section ${n + 1} (${sectionName(b.type)}): ${what}`);
    const { words, noTags } = sectionWords(b);
    if (noTags.some(hasDisclaimer)) at('a disclaimer tag cannot go in a label or a topic title. Put it in the words instead.');
    if (knownDisclaimers) {
      const unknown = [...new Set(words.flatMap(disclaimerIds))].filter((id) => !knownDisclaimers.includes(id));
      if (unknown.length) at(`there is no disclaimer called ${unknown.map((id) => `"${id}"`).join(', ')}. Add it under Disclaimers, or take the tag out.`);
    }
    switch (b.type) {
      case 'showcase':
        if (!b.title.trim()) at('add a heading.');
        if (!b.image.url) at('add a picture.');
        else if (b.image.fit === 'frame' && b.image.second && !b.image.second.url) at('add the second phone’s screenshot, or switch to one phone.');
        break;
      case 'cards':
        if (!b.title.trim()) at('add a heading.');
        b.cards.forEach((c, i) => {
          if (!c.title.trim()) at(`card ${i + 1} needs a title.`);
          if (!c.image.url) at(`card ${i + 1} needs a picture.`);
          else if (c.image.fit === 'frame' && c.image.second && !c.image.second.url) at(`card ${i + 1} needs the second phone’s screenshot, or switch to one phone.`);
        });
        break;
      case 'callout':
        if (!b.title.trim()) at('add the sentence.');
        break;
      case 'points':
        b.items.forEach((it, i) => {
          if (!it.title.trim()) at(`reason ${i + 1} needs a title.`);
        });
        break;
      case 'tabs':
        b.items.forEach((it, i) => {
          if (!it.title.trim()) at(`topic ${i + 1} needs a title.`);
          if (!it.image.url) at(`topic ${i + 1} needs a picture.`);
          else if (it.image.fit === 'frame' && it.image.second && !it.image.second.url) at(`topic ${i + 1} needs the second phone’s screenshot, or switch to one phone.`);
        });
        break;
      case 'banner':
        if (!b.image.url) at('add a picture.');
        break;
      case 'video':
        if (!b.video.url) at('add a video link, or upload a video.');
        else if (!b.video.url.startsWith('blob:') && !safeVideoUrl(b.video.url)) at('the video link must be a YouTube link or an https address of a video file.');
        break;
    }
  });
  return problems;
}

// ---------------------------------------------------------------------------
// Pictures and videos inside sections (for uploading on save)
// ---------------------------------------------------------------------------

const mapImage = (image: FeatureImage, fn: (url: string) => string): FeatureImage => ({
  ...image,
  url: image.url ? fn(image.url) : image.url,
  ...(image.second ? { second: { ...image.second, url: image.second.url ? fn(image.second.url) : image.second.url } } : {}),
});

/** The same sections with every picture, poster and video address passed through `fn`. */
export function mapBlockUrls(blocks: FeatureBlock[], fn: (url: string) => string): FeatureBlock[] {
  return blocks.map((b): FeatureBlock => {
    switch (b.type) {
      case 'showcase':
      case 'banner':
        return { ...b, image: mapImage(b.image, fn) };
      case 'cards':
        return { ...b, cards: b.cards.map((c) => ({ ...c, image: mapImage(c.image, fn) })) };
      case 'tabs':
        return { ...b, items: b.items.map((i) => ({ ...i, image: mapImage(i.image, fn) })) };
      case 'video':
        return { ...b, video: { ...b.video, url: b.video.url ? fn(b.video.url) : b.video.url, ...(b.video.poster ? { poster: fn(b.video.poster) } : {}) } };
      default:
        return b;
    }
  });
}

/** Every picture, poster and video address in the sections. */
export function blockUrls(blocks: FeatureBlock[]): string[] {
  const urls: string[] = [];
  mapBlockUrls(blocks, (u) => {
    urls.push(u);
    return u;
  });
  return urls;
}

/** A line saying what a section holds, for its heading in the list. */
export function sectionSummary(b: FeatureBlock): string {
  switch (b.type) {
    case 'callout':
    case 'showcase':
      return b.title || '';
    case 'cards':
      return b.title || `${b.cards.length} cards`;
    case 'points':
      return b.title || `${b.items.length} reasons`;
    case 'tabs':
      return b.title || b.items.map((i) => i.title).filter(Boolean).join(', ');
    case 'banner':
      return b.title || '';
    case 'video':
      return b.title || (b.video.aspect === '9:16' ? 'Phone-shaped video' : 'Widescreen video');
  }
}
