// Disclaimers: short notices (health, vet, "not advice") that sit behind a small (i) icon next to a word.
//
// Each disclaimer is written once, in the admin (Cuppi > Disclaimers, stored as cuppi_home/disclaimers), and given a
// short id such as "health". Anywhere in a page's text, a tag straight after a word, `Medication{i:health}`, puts the
// icon next to that word; hovering over it (or tapping it, or tabbing to it) opens a bubble with the disclaimer.
// Because the wording lives in one place, changing it changes it everywhere it is used.
//
// This file holds the plain logic (reading the tags, reading what is stored), with no imports from the app, so the
// unit tests can load it from Node. The icon and bubble are in src/components/cuppi/disclaimer.tsx.

export type Disclaimer = {
  /** What the tag uses: lowercase words joined by hyphens, e.g. "health". */
  id: string;
  /** A name for the admin's own use, e.g. "Health and medication". Never shown on the site. */
  label: string;
  /** What the bubble says. */
  text: string;
};

export const DISCLAIMER_LIMITS = { items: 40, id: 32, label: 60, text: 700 } as const;

const ID_SOURCE = '[a-z0-9]+(?:-[a-z0-9]+)*';
export const isDisclaimerId = (id: string): boolean => id.length > 0 && id.length <= DISCLAIMER_LIMITS.id && new RegExp(`^${ID_SOURCE}$`).test(id);

// A tag: {i:health}. The id is checked again where it is used, so the pattern only has to find candidates.
const tagPattern = () => /\{i:([a-z0-9-]{1,32})\}/g;

/** The tag that puts this disclaimer's icon after a word. */
export const disclaimerTag = (id: string): string => `{i:${id}}`;

export type TextPart = string | { disclaimer: string };

/** "Medication{i:health} is on time" -> ["Medication", {disclaimer: "health"}, " is on time"]. Plain text gives one string. */
export function splitDisclaimers(text: string): TextPart[] {
  const parts: TextPart[] = [];
  let last = 0;
  for (const m of text.matchAll(tagPattern())) {
    if (m.index! > last) parts.push(text.slice(last, m.index));
    parts.push({ disclaimer: m[1] });
    last = m.index! + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts.length ? parts : [text];
}

/** The text with its tags (and any space before them) taken out: for places that cannot show the icon (page descriptions, button labels). */
export const stripDisclaimers = (text: string): string => text.replace(/\s*\{i:[a-z0-9-]{1,32}\}/g, '');

/** The ids of every tag in the text, in order. */
export const disclaimerIds = (text: string): string[] => [...text.matchAll(tagPattern())].map((m) => m[1]);

/** Whether the text has any tag. */
export const hasDisclaimer = (text: string): boolean => tagPattern().test(text);

// ---------------------------------------------------------------------------
// What is stored
// ---------------------------------------------------------------------------

const clean = (v: unknown, max: number): string => (typeof v === 'string' ? v.trim().slice(0, max) : '');

/**
 * The stored document ({ items: [...] }) -> disclaimers that are safe to use. An entry with a bad id or no words is
 * dropped, a repeated id keeps its first, and the list is capped; nothing else is affected.
 */
export function resolveDisclaimers(stored: unknown): Disclaimer[] {
  const items = stored && typeof stored === 'object' ? (stored as { items?: unknown }).items : null;
  if (!Array.isArray(items)) return [];
  const seen = new Set<string>();
  const out: Disclaimer[] = [];
  for (const raw of items) {
    if (!raw || typeof raw !== 'object') continue;
    const r = raw as Record<string, unknown>;
    const id = clean(r.id, DISCLAIMER_LIMITS.id);
    const text = clean(r.text, DISCLAIMER_LIMITS.text);
    if (!isDisclaimerId(id) || !text || seen.has(id)) continue;
    seen.add(id);
    out.push({ id, label: clean(r.label, DISCLAIMER_LIMITS.label) || id, text });
    if (out.length >= DISCLAIMER_LIMITS.items) break;
  }
  return out;
}

/** Plain-English problems with a list being edited, run when the admin saves. Empty means it can be saved. */
export function validateDisclaimers(list: Disclaimer[]): string[] {
  const problems: string[] = [];
  const seen = new Set<string>();
  list.forEach((d, n) => {
    const at = `Disclaimer ${n + 1}${d.label.trim() ? ` (${d.label.trim()})` : ''}`;
    if (!d.id) problems.push(`${at}: needs a tag name.`);
    else if (!isDisclaimerId(d.id)) problems.push(`${at}: the tag name "${d.id}" can only use lowercase letters, numbers and hyphens.`);
    else if (seen.has(d.id)) problems.push(`${at}: the tag name "${d.id}" is used twice.`);
    seen.add(d.id);
    if (!d.text.trim()) problems.push(`${at}: needs the words for the bubble.`);
  });
  return problems;
}
