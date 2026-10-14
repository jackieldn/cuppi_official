// Turns the FAQ documents from Sanity into the structure the FAQ pages render:
// topic pages ("sections"), optional sub-topics, stable anchor slugs, and a
// plain-text copy of every answer for previews, search and structured data.
//
// Pure functions with no imports, so Node's test runner can load this file.

/** A FAQ document as returned by the GROQ query in faq.ts. */
export type RawFaq = {
  _id: string;
  _createdAt?: string;
  _updatedAt?: string;
  question?: string | null;
  answer?: unknown;
  category?: string | null;
  order?: number | null;
  /** Optional Studio field: sub-topic within the category. */
  topic?: string | null;
  /** Optional Studio field: locks the anchor so rewording never breaks a link. */
  slug?: string | null;
  /** Optional Studio field: show under "Popular questions". */
  featured?: boolean | null;
};

export type FaqEntry = {
  id: string;
  /** Anchor and permalink: /faq/<section>#<slug>. */
  slug: string;
  question: string;
  /** Portable Text, rendered by the page. */
  answer: any[];
  /** Answer as plain text, blocks separated by newlines. Excludes videos. */
  plain: string;
  /** One line shown under the question while it is collapsed. */
  preview: string;
  videoUrls: string[];
  sectionId: string;
  topic: string | null;
  updatedAt: string;
};

export type FaqTopic = { id: string; label: string; entries: FaqEntry[] };

export type FaqSection = {
  id: string;
  label: string;
  blurb: string;
  group: string;
  entries: FaqEntry[];
  /** Empty when the section has no sub-topics: render `entries` as a flat list. */
  topics: FaqTopic[];
  updatedAt: string;
};

export type FaqGroup = { label: string; sections: FaqSection[] };

export type FaqModel = {
  sections: FaqSection[];
  groups: FaqGroup[];
  entries: FaqEntry[];
  popular: FaqEntry[];
  /** Most recent edit across the whole FAQ. */
  updatedAt: string;
};

export type SectionConfig = {
  id: string;
  label: string;
  blurb: string;
  group: string;
  /** Sanity `category` values shown on this page. */
  categories: string[];
};

/** Reading order and sub-topics, keyed by document _id. `topic: null` is a flat list. */
export type LayoutGroup = { topic: string | null; ids: string[] };

export type ModelConfig = {
  sections: SectionConfig[];
  groupOrder: string[];
  layout: Record<string, LayoutGroup[]>;
  popularIds: string[];
  /** URL segments the FAQ router owns, so an auto-created section never shadows them. */
  reservedSectionIds: string[];
};

const OTHER_GROUP = 'More topics';
const OTHER_TOPIC = 'More questions';

// Accents are stripped so "café" and "cafe" share an anchor.
const COMBINING_MARKS = new RegExp('[\\u0300-\\u036f]', 'g');

export function slugify(text: string): string {
  return text
    .normalize('NFKD')
    .replace(COMBINING_MARKS, '')
    .toLowerCase()
    .replace(/['‘’"“”]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
    .replace(/-+$/, '');
}

export function formatCategoryTitle(category: string): string {
  return category
    .split('-')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function blockText(block: any): string {
  return Array.isArray(block?.children) ? block.children.map((c: any) => (typeof c?.text === 'string' ? c.text : '')).join('') : '';
}

/** Answer text without markup: paragraphs and list items on their own lines, tables as rows. */
export function portableTextToPlain(blocks: unknown): string {
  if (!Array.isArray(blocks)) return '';
  const lines: string[] = [];
  for (const block of blocks) {
    if (block?._type === 'block') {
      const t = blockText(block).replace(/\s+/g, ' ').trim();
      if (t) lines.push(t);
    } else if (block?._type === 'simpleTable' && Array.isArray(block.rows)) {
      for (const row of block.rows) {
        const cells = Array.isArray(row?.cells) ? row.cells.filter((c: unknown) => typeof c === 'string' && c.trim()) : [];
        if (cells.length) lines.push(cells.join(': '));
      }
    }
  }
  return lines.join('\n');
}

export function videoUrlsOf(blocks: unknown): string[] {
  if (!Array.isArray(blocks)) return [];
  return blocks
    .filter((b) => b?._type === 'youtube' && typeof b.url === 'string' && b.url.trim())
    .map((b) => b.url.trim());
}

/** Stub answers ("Tutorial coming soon") are not worth a page entry or a search hit. */
export function isPlaceholderAnswer(plain: string): boolean {
  return /^(?:\w+\s+)?(?:coming soon|tbc|tbd)\.?$/i.test(plain.trim());
}

function previewOf(plain: string, hasVideo: boolean): string {
  const flat = plain.replace(/\s+/g, ' ').trim();
  if (!flat) return hasVideo ? 'Video walkthrough' : '';
  if (flat.length <= 140) return flat;
  return flat.slice(0, 138).replace(/\s+\S*$/, '') + '…';
}

type Prepared = {
  raw: RawFaq;
  entry: FaqEntry;
  rank: number;
  hasHint: boolean;
  order: number;
  created: string;
};

function sortPrepared(a: Prepared, b: Prepared): number {
  if (a.hasHint !== b.hasHint) return a.hasHint ? -1 : 1;
  if (a.rank !== b.rank) return a.rank - b.rank;
  if (a.order !== b.order) return a.order - b.order;
  if (a.created !== b.created) return a.created < b.created ? -1 : 1;
  return a.entry.question.localeCompare(b.entry.question);
}

export function buildFaqModel(rawFaqs: RawFaq[], config: ModelConfig): FaqModel {
  const reserved = new Set(config.reservedSectionIds);
  const sectionByCategory = new Map<string, SectionConfig>();
  for (const s of config.sections) for (const c of s.categories) sectionByCategory.set(c, s);

  // Hints from the layout file: where each known answer sits and under which sub-topic.
  const hintById = new Map<string, { sectionId: string; topic: string | null; rank: number }>();
  for (const [sectionId, groups] of Object.entries(config.layout)) {
    let rank = 0;
    for (const g of groups) for (const id of g.ids) hintById.set(id, { sectionId, topic: g.topic, rank: rank++ });
  }

  // Anchors are handed out oldest-first so adding a question never changes an existing link.
  const used = new Set<string>();
  const slugById = new Map<string, string>();
  const byAge = [...rawFaqs].sort((a, b) => {
    const ca = a._createdAt ?? '';
    const cb = b._createdAt ?? '';
    return ca === cb ? a._id.localeCompare(b._id) : ca < cb ? -1 : 1;
  });
  for (const raw of byAge) {
    const wanted = (raw.slug && slugify(raw.slug)) || slugify(raw.question ?? '') || `q-${raw._id.slice(-6).toLowerCase()}`;
    let slug = wanted;
    for (let n = 2; used.has(slug); n++) slug = `${wanted}-${n}`;
    used.add(slug);
    slugById.set(raw._id, slug);
  }

  const bySection = new Map<string, { config: SectionConfig; items: Prepared[] }>();
  const sectionFor = (category: string): SectionConfig => {
    const known = sectionByCategory.get(category);
    if (known) return known;
    // A category nobody has mapped yet still gets its own page.
    let id = slugify(category) || 'other';
    if (reserved.has(id)) id = `${id}-faq`;
    const made: SectionConfig = { id, label: formatCategoryTitle(category) || 'Other', blurb: '', group: OTHER_GROUP, categories: [category] };
    sectionByCategory.set(category, made);
    return made;
  };

  for (const raw of rawFaqs) {
    const question = (raw.question ?? '').replace(/\s+/g, ' ').trim();
    const answer = Array.isArray(raw.answer) ? raw.answer : [];
    const plain = portableTextToPlain(answer);
    const videoUrls = videoUrlsOf(answer);
    if (!question) continue;
    if (!plain && videoUrls.length === 0) continue;
    if (isPlaceholderAnswer(plain) && videoUrls.length === 0) continue;

    const sectionConfig = sectionFor((raw.category ?? '').trim() || 'general');
    const hint = hintById.get(raw._id);
    const editorTopic = (raw.topic ?? '').replace(/\s+/g, ' ').trim();
    const topic = editorTopic || (hint && hint.sectionId === sectionConfig.id ? hint.topic : null);

    const entry: FaqEntry = {
      id: raw._id,
      slug: slugById.get(raw._id) as string,
      question,
      answer,
      plain,
      preview: previewOf(plain, videoUrls.length > 0),
      videoUrls,
      sectionId: sectionConfig.id,
      topic: topic || null,
      updatedAt: raw._updatedAt ?? raw._createdAt ?? '',
    };
    const bucket = bySection.get(sectionConfig.id) ?? { config: sectionConfig, items: [] };
    bucket.items.push({
      raw,
      entry,
      rank: hint && hint.sectionId === sectionConfig.id ? hint.rank : 0,
      hasHint: !!hint && hint.sectionId === sectionConfig.id,
      order: typeof raw.order === 'number' ? raw.order : 9999,
      created: raw._createdAt ?? '',
    });
    bySection.set(sectionConfig.id, bucket);
  }

  const sections: FaqSection[] = [];
  const configured = config.sections.map((s) => s.id);
  const ids = [
    ...configured.filter((id) => bySection.has(id)),
    ...[...bySection.keys()].filter((id) => !configured.includes(id)).sort(),
  ];

  for (const id of ids) {
    const { config: sc, items } = bySection.get(id) as { config: SectionConfig; items: Prepared[] };
    items.sort(sortPrepared);
    const entries = items.map((i) => i.entry);

    const anyTopic = entries.some((e) => e.topic);
    const topics: FaqTopic[] = [];
    if (anyTopic) {
      const seen = new Map<string, FaqTopic>();
      const used = new Set<string>();
      for (const e of entries) {
        const label = e.topic ?? OTHER_TOPIC;
        let t = seen.get(label);
        if (!t) {
          let topicId = `topic-${slugify(label) || 'more'}`;
          for (let n = 2; used.has(topicId); n++) topicId = `topic-${slugify(label)}-${n}`;
          used.add(topicId);
          t = { id: topicId, label, entries: [] };
          seen.set(label, t);
          topics.push(t);
        }
        t.entries.push(e);
      }
      // The catch-all always comes last.
      topics.sort((a, b) => Number(a.label === OTHER_TOPIC) - Number(b.label === OTHER_TOPIC));
    }

    sections.push({
      id: sc.id,
      label: sc.label,
      blurb: sc.blurb,
      group: sc.group,
      entries,
      topics,
      updatedAt: entries.reduce((m, e) => (e.updatedAt > m ? e.updatedAt : m), ''),
    });
  }

  const groupLabels = [
    ...config.groupOrder.filter((g) => sections.some((s) => s.group === g)),
    ...sections.map((s) => s.group).filter((g, i, all) => !config.groupOrder.includes(g) && all.indexOf(g) === i),
  ];
  const groups = groupLabels.map((label) => ({ label, sections: sections.filter((s) => s.group === label) }));

  const entries = sections.flatMap((s) => s.entries);
  const featured = new Set(rawFaqs.filter((r) => r.featured === true).map((r) => r._id));
  const wantedIds = featured.size ? [...featured] : config.popularIds;
  const popular = wantedIds
    .map((id) => entries.find((e) => e.id === id))
    .filter((e): e is FaqEntry => !!e)
    .slice(0, 6);

  return {
    sections,
    groups,
    entries,
    popular,
    updatedAt: entries.reduce((m, e) => (e.updatedAt > m ? e.updatedAt : m), ''),
  };
}

export function findSection(model: FaqModel, id: string): FaqSection | undefined {
  return model.sections.find((s) => s.id === id);
}

export function sectionPath(sectionId: string): string {
  return `/faq/${sectionId}`;
}

export function entryPath(entry: Pick<FaqEntry, 'sectionId' | 'slug'>): string {
  return `/faq/${entry.sectionId}#${entry.slug}`;
}
