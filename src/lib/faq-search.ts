// Search over the FAQ. 157 short documents need no search service: the index is
// built in memory (on the server for /faq/search, in the browser for the
// instant dropdown) and every query scans it.
//
// Pure functions with no imports, so Node's test runner can load this file.

/** One searchable answer. Kept small: this is what /faq/search-index.json ships. */
export type SearchDoc = {
  slug: string;
  sectionId: string;
  sectionLabel: string;
  topic: string | null;
  question: string;
  text: string;
};

type IndexedDoc = {
  doc: SearchDoc;
  position: number;
  question: string[];
  where: string[];
  body: string[];
  questionFlat: string;
  bodyFlat: string;
};

export type SearchIndex = { docs: IndexedDoc[] };

export type SearchResult = { doc: SearchDoc; score: number };

export type SearchOutcome = {
  results: SearchResult[];
  /** Words to highlight in results (what was typed, plus their stems). */
  terms: string[];
  /** True when no answer contains every word, so results match only some of them. */
  partial: boolean;
};

const STOP_WORDS = new Set(
  'a an the i my me we you your how do does did can could would should to of is are was be in on at and or for it its if when what why with not that this there from by as so cuppi'.split(' '),
);

// What people type, mapped to what the answers actually say.
const SYNONYMS: Record<string, string[]> = {
  bin: ['rubbish', 'recycling', 'refuse', 'waste', 'collection'],
  rubbish: ['bin'], recycling: ['bin'], refuse: ['bin'], trash: ['bin'], waste: ['bin'],
  pay: ['subscription', 'billing'], payment: ['subscription', 'billing'], bill: ['subscription'],
  price: ['subscription', 'pro'], cost: ['subscription', 'pro'],
  cancel: ['subscription'], unsubscribe: ['cancelling', 'subscription'],
  kid: ['child'], children: ['child'], baby: ['child'],
  dog: ['pet'], cat: ['pet'], puppy: ['pet'],
  passcode: ['pin'], password: ['pin'],
  invoice: ['receipt'],
  voucher: ['code', 'redeem'], promo: ['code', 'redeem'],
  partner: ['household', 'member'], family: ['household', 'member'], invite: ['member', 'household'],
  login: ['sign'], logout: ['signing'],
  remove: ['delete'], scan: ['scanner'], camera: ['photo'],
  money: ['budget'], spend: ['budget'],
};

function words(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/['‘’]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean);
}

function stem(word: string): string {
  if (word.length > 4) return word.replace(/(ies|ing|es|ed|s)$/, (m) => (m === 'ies' ? 'y' : ''));
  if (word.length > 3) return word.replace(/s$/, '');
  return word;
}

function unique<T>(items: T[]): T[] {
  return [...new Set(items)];
}

export function buildSearchIndex(docs: SearchDoc[]): SearchIndex {
  return {
    docs: docs.map((doc, position) => ({
      doc,
      position,
      question: unique(words(doc.question).map(stem)),
      where: unique(words(`${doc.sectionLabel} ${doc.topic ?? ''}`).map(stem)),
      body: unique(words(doc.text).map(stem)),
      questionFlat: words(doc.question).join(' '),
      bodyFlat: words(doc.text).join(' '),
    })),
  };
}

// Exact word match scores `exact`; a shared prefix (both 4+ letters, so "pro"
// never matches "profile") scores `prefix`.
function match(terms: string[], word: string, exact: number, prefix: number): number {
  if (terms.includes(word)) return exact;
  if (word.length >= 4) {
    for (const t of terms) {
      if (t.length >= 4 && (t.startsWith(word) || word.startsWith(t))) return prefix;
    }
  }
  return 0;
}

type QueryWord = { raw: string; stem: string; alternatives: string[] };

function parse(query: string): { words: QueryWord[]; phrase: string } {
  const all = words(query);
  let kept = all.filter((w) => !STOP_WORDS.has(w));
  if (kept.length === 0) kept = all;
  return {
    phrase: all.join(' '),
    words: kept.map((raw) => {
      const s = stem(raw);
      return { raw, stem: s, alternatives: unique((SYNONYMS[raw] ?? SYNONYMS[s] ?? []).map(stem)) };
    }),
  };
}

function scoreDoc(item: IndexedDoc, query: ReturnType<typeof parse>): { score: number; missing: number } {
  let score = 0;
  let missing = 0;
  for (const w of query.words) {
    let best = Math.max(match(item.question, w.stem, 10, 6), match(item.where, w.stem, 4, 3), match(item.body, w.stem, 3, 1.5));
    for (const alt of w.alternatives) {
      best = Math.max(best, 0.6 * Math.max(match(item.question, alt, 10, 6), match(item.where, alt, 4, 3), match(item.body, alt, 3, 1.5)));
    }
    if (best === 0) missing++;
    score += best;
  }
  if (query.phrase.length > 2) {
    if (item.questionFlat.includes(query.phrase)) score += 12;
    else if (item.bodyFlat.includes(query.phrase)) score += 4;
  }
  return { score, missing };
}

export function searchFaq(index: SearchIndex, query: string, limit = 50): SearchOutcome {
  const parsed = parse(query);
  if (parsed.words.length === 0) return { results: [], terms: [], partial: false };

  const scored = index.docs
    .map((item) => ({ item, ...scoreDoc(item, parsed) }))
    .filter((s) => s.score > 0);
  const complete = scored.filter((s) => s.missing === 0);
  const partial = complete.length === 0 && scored.length > 0;
  const pool = partial ? scored.filter((s) => s.missing < parsed.words.length) : complete;

  const results = pool
    .sort((a, b) => b.score - a.score || a.item.position - b.item.position)
    .slice(0, limit)
    .map((s) => ({ doc: s.item.doc, score: s.score }));

  const terms = unique(parsed.words.flatMap((w) => [w.raw, ...(w.stem.length >= 3 && w.stem !== w.raw ? [w.stem] : [])]));
  return { results, terms, partial };
}

export type Segment = { text: string; match: boolean };

/** Splits text into plain and highlighted pieces. Words that start with a search term are highlighted. */
export function highlight(text: string, terms: string[]): Segment[] {
  const usable = terms.filter((t) => /^[a-z0-9]+$/.test(t));
  if (!text) return [];
  if (usable.length === 0) return [{ text, match: false }];
  const re = new RegExp(`\\b(?:${usable.join('|')})[a-z0-9]*`, 'gi');
  const out: Segment[] = [];
  let last = 0;
  for (const m of text.matchAll(re)) {
    const at = m.index ?? 0;
    if (at > last) out.push({ text: text.slice(last, at), match: false });
    out.push({ text: m[0], match: true });
    last = at + m[0].length;
  }
  if (last < text.length) out.push({ text: text.slice(last), match: false });
  return out;
}

/** A short excerpt of the answer around the first match, ready for highlight(). */
export function snippet(text: string, terms: string[], width = 220): string {
  const flat = text.replace(/\s+/g, ' ').trim();
  const usable = terms.filter((t) => /^[a-z0-9]+$/.test(t));
  let at = -1;
  if (usable.length) {
    const m = new RegExp(`\\b(?:${usable.join('|')})[a-z0-9]*`, 'i').exec(flat);
    if (m) at = m.index;
  }
  if (at < 0) return flat.length > width ? flat.slice(0, width - 2).replace(/\s+\S*$/, '') + '…' : flat;
  const from = Math.max(0, at - 70);
  let start = from;
  if (from > 0) {
    const space = flat.indexOf(' ', from);
    start = space === -1 ? from : space + 1;
  }
  const end = Math.min(flat.length, from + width);
  let body = flat.slice(start, end);
  if (end < flat.length) body = body.replace(/\s+\S*$/, '');
  return (start > 0 ? '…' : '') + body + (end < flat.length ? '…' : '');
}
