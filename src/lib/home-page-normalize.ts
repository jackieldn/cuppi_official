import type { HomeCard, HomeImage, HomePage, HomeSection } from './home-page-types';

// next/image refuses hosts that are not in next.config.ts, which would take the
// whole page down. Only accept images from places the config allows.
const ALLOWED_IMAGE_PREFIXES = [
  'https://cdn.sanity.io/images/0uvqbyjc/',
  'https://firebasestorage.googleapis.com/v0/b/studio-5700093446-89b93.firebasestorage.app/',
];

const SECTION_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function image(url: unknown, alt: unknown, fallbackAlt: string): HomeImage | null {
  const u = text(url);
  if (!u || !ALLOWED_IMAGE_PREFIXES.some((prefix) => u.startsWith(prefix))) return null;
  return { url: u, alt: text(alt) ?? fallbackAlt };
}

function card(raw: any): HomeCard | null {
  const title = text(raw?.title);
  const description = text(raw?.description);
  const img = title ? image(raw?.imageUrl, raw?.imageAlt, title) : null;
  return title && description && img ? { title, description, image: img } : null;
}

function section(raw: any): HomeSection | null {
  const id = text(raw?.id);
  const eyebrow = text(raw?.eyebrow);
  const heading = text(raw?.heading);
  const intro = text(raw?.intro);
  if (!id || !SECTION_ID.test(id) || !eyebrow || !heading || !intro) return null;
  const base = { id, eyebrow, heading, intro };

  if (raw.kind === 'carousel') {
    const rawCards: unknown[] = Array.isArray(raw.cards) ? raw.cards : [];
    const cards = rawCards.map(card).filter((c): c is HomeCard => c !== null);
    if (cards.length === 0) return null;
    const rawNotes: unknown[] = Array.isArray(raw.footnotes) ? raw.footnotes : [];
    const footnotes = rawNotes.map(text).filter((f): f is string => f !== null);
    return { kind: 'carousel', ...base, cards, footnotes };
  }

  if (raw.kind === 'image') {
    const img = image(raw.imageUrl, raw.imageAlt, heading);
    return img ? { kind: 'image', ...base, image: img } : null;
  }

  return null;
}

/**
 * Turns the raw Sanity result into a page that is safe to render, dropping
 * anything incomplete (a card with no image, a section with no heading, ...).
 * Returns null when what is left is not a usable page, so the caller can fall
 * back to the built-in copy.
 */
export function normalizeHomePage(raw: any): HomePage | null {
  const line1 = text(raw?.hero?.line1);
  const line2 = text(raw?.hero?.line2);
  const heroImage = image(raw?.hero?.imageUrl, raw?.hero?.imageAlt, 'Cuppi');
  if (!line1 || !line2 || !heroImage) return null;

  const seen = new Set<string>();
  const rawSections: unknown[] = Array.isArray(raw?.sections) ? raw.sections : [];
  const sections = rawSections
    .map(section)
    .filter((s): s is HomeSection => {
      if (!s || seen.has(s.id)) return false; // duplicate anchors would break the nav links
      seen.add(s.id);
      return true;
    });
  if (sections.length === 0) return null;

  return { hero: { line1, line2, image: heroImage }, sections };
}
