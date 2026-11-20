// The comparison page's stored content (cuppi_home/compare): reading it safely, writing it, and checking a draft.
//
// Whatever is stored is only ever read through resolveCompare, which keeps what is usable and falls back to the default for
// anything that is not, field by field. A bad or half-written document can therefore make the page plainer, never break it,
// and nothing stored gives exactly the default content, so the page works before it is ever edited.

import { TILE_COLOURS_LIST } from './features-types.ts';
import {
  APP_IDS,
  COMPARE_LIMITS as L,
  REASON_ICONS,
  RIVALS,
  allRows,
  defaultCompare,
  isExternalUrl,
  type AppId,
  type Cell,
  type CompareContent,
  type DataPanel,
  type FactGroup,
  type FactRow,
  type Reason,
  type ReasonIcon,
  type RivalPrice,
  type Shot,
  type SnapApp,
  type Snapshot,
  type Source,
} from './compare-data.ts';

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);

/** A trimmed, non-empty string cut to `max`, or undefined. */
const str = (v: unknown, max: number): string | undefined => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : undefined);

/** Text that may be cleared on purpose: an empty string stays empty (and a non-string is undefined). */
const textOrEmpty = (v: unknown, max: number): string | undefined => (typeof v === 'string' ? v.trim().slice(0, max) : undefined);

const ISO = /^\d{4}-\d{2}-\d{2}$/;
const isoDate = (v: unknown): string | undefined => (typeof v === 'string' && ISO.test(v) && !Number.isNaN(Date.parse(v)) ? v : undefined);

const ID = /^[a-z0-9][a-z0-9-]{0,39}$/;
const idOf = (v: unknown): string | undefined => (typeof v === 'string' && ID.test(v) ? v : undefined);

const list = (v: unknown, max: number, each: number): string[] =>
  Array.isArray(v) ? v.flatMap((x) => (str(x, each) ? [str(x, each)!] : [])).slice(0, max) : [];

/** An address that may be used as a link: https, or a page on this site. */
const urlOf = (v: unknown): string | undefined => (typeof v === 'string' && /^(https:\/\/\S+|\/[A-Za-z0-9\-._~/?#=&%]*)$/.test(v.trim()) ? v.trim().slice(0, 500) : undefined);

/** An uploaded picture's address: on this site, or the site's storage (https). */
const srcOf = (v: unknown): string | undefined => (typeof v === 'string' && /^(https:\/\/\S+|\/\S+)$/.test(v.trim()) ? v.trim().slice(0, 1000) : undefined);

// ---------------------------------------------------------------------------
// Reading
// ---------------------------------------------------------------------------

/** What a screenshot's size is taken to be when it was saved without one: a typical iPhone screenshot. The picture fills its screen either way. */
export const UNKNOWN_SHOT_SIZE = { width: 1170, height: 2532 } as const;

export function readShots(raw: unknown): Shot[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .flatMap((r): Shot[] => {
      if (!isObj(r)) return [];
      const src = srcOf(r.src);
      if (!src) return [];
      // A picture saved with no usable size is still a picture: keep it, at the usual shape, rather than lose it.
      const width = Number(r.width);
      const height = Number(r.height);
      const known = width > 0 && height > 0;
      return [{ src, width: known ? Math.round(width) : UNKNOWN_SHOT_SIZE.width, height: known ? Math.round(height) : UNKNOWN_SHOT_SIZE.height, alt: textOrEmpty(r.alt, L.line) ?? '' }];
    })
    .slice(0, L.shots);
}

function readCell(raw: unknown): Cell {
  if (!isObj(raw)) return { kind: 'tbc' };
  const text = str(raw.text, L.line);
  switch (raw.kind) {
    case 'yes':
      return { kind: 'yes', ...(text ? { text } : {}) };
    case 'no':
      return { kind: 'no' };
    case 'text':
      return text ? { kind: 'text', text, ...(raw.good === true ? { good: true } : {}) } : { kind: 'no' };
    default:
      return { kind: 'tbc', ...(text ? { text } : {}) };
  }
}

function readRow(raw: unknown, used: Set<string>): FactRow | null {
  if (!isObj(raw)) return null;
  const label = str(raw.label, L.short);
  if (!label) return null;
  let id = idOf(raw.id) ?? 'row';
  for (let n = 2; used.has(id); n++) id = `${idOf(raw.id) ?? 'row'}-${n}`.slice(0, 40);
  used.add(id);
  const cells = isObj(raw.cells) ? raw.cells : {};
  const sources = isObj(raw.sources) ? raw.sources : {};
  const detail = str(raw.detail, L.line);
  return {
    id,
    label,
    ...(detail ? { detail } : {}),
    cells: { cuppi: readCell(cells.cuppi), hartley: readCell(cells.hartley), familywall: readCell(cells.familywall) },
    sources: { hartley: list(sources.hartley, L.list, 40), familywall: list(sources.familywall, L.list, 40) },
  };
}

function readGroups(raw: unknown): FactGroup[] | null {
  if (!Array.isArray(raw)) return null;
  const usedRows = new Set<string>();
  const usedGroups = new Set<string>();
  const groups = raw
    .slice(0, L.groups)
    .flatMap((g): FactGroup[] => {
      if (!isObj(g)) return [];
      const title = str(g.title, L.short);
      if (!title) return [];
      let id = idOf(g.id) ?? 'group';
      for (let n = 2; usedGroups.has(id); n++) id = `${idOf(g.id) ?? 'group'}-${n}`.slice(0, 40);
      usedGroups.add(id);
      const rows = (Array.isArray(g.rows) ? g.rows : []).flatMap((r) => {
        if (usedRows.size >= L.rows) return [];
        const row = readRow(r, usedRows);
        return row ? [row] : [];
      });
      return [{ id, title, rows }];
    });
  return groups.length > 0 ? groups : null;
}

function readPanel(raw: unknown, base: DataPanel): DataPanel {
  if (!isObj(raw)) return base;
  const note = textOrEmpty(raw.note, L.text);
  return {
    tracking: Array.isArray(raw.tracking) ? list(raw.tracking, L.list, L.short) : base.tracking,
    identifiers: Array.isArray(raw.identifiers) ? list(raw.identifiers, L.list, L.line) : base.identifiers,
    linked: Array.isArray(raw.linked) ? list(raw.linked, L.list, L.short) : base.linked,
    notLinked: Array.isArray(raw.notLinked) ? list(raw.notLinked, L.list, L.short) : base.notLinked,
    ...(note ? { note } : {}),
    sources: Array.isArray(raw.sources) ? list(raw.sources, L.list, 40) : base.sources,
  };
}

function readSources(raw: unknown): Source[] | null {
  if (!Array.isArray(raw)) return null;
  const used = new Set<string>();
  const sources = raw.slice(0, L.sources).flatMap((r): Source[] => {
    if (!isObj(r)) return [];
    const id = idOf(r.id);
    const label = str(r.label, L.line);
    const checkedOn = isoDate(r.checkedOn);
    if (!id || !label || !checkedOn || used.has(id)) return [];
    used.add(id);
    const url = urlOf(r.url);
    return [{ id, label, ...(url ? { url } : {}), checkedOn }];
  });
  return sources.length > 0 ? sources : null;
}

function readPrice(raw: unknown, base: RivalPrice): RivalPrice {
  if (!isObj(raw)) return base;
  const monthly = Number(raw.monthly);
  return {
    monthly: raw.monthly !== '' && raw.monthly !== null && Number.isFinite(monthly) && monthly >= 0 ? Math.round(monthly * 100) / 100 : base.monthly,
    funding: str(raw.funding, L.line) ?? base.funding,
    sources: Array.isArray(raw.sources) ? list(raw.sources, L.list, 40) : base.sources,
  };
}

function readSnapApp(raw: unknown): SnapApp {
  if (!isObj(raw)) return { shots: [] };
  const version = str(raw.version, L.short);
  const device = str(raw.device, L.short);
  const testedOn = isoDate(raw.testedOn);
  const what = str(raw.what, L.line);
  return { shots: readShots(raw.shots), ...(version ? { version } : {}), ...(device ? { device } : {}), ...(testedOn ? { testedOn } : {}), ...(what ? { what } : {}) };
}

function readSnapshots(raw: unknown): Snapshot[] {
  if (!Array.isArray(raw)) return [];
  const used = new Set<string>();
  return raw.slice(0, L.snapshots).flatMap((r): Snapshot[] => {
    if (!isObj(r)) return [];
    const rowId = idOf(r.rowId);
    if (!rowId || used.has(rowId)) return [];
    used.add(rowId);
    const apps = isObj(r.apps) ? r.apps : {};
    const note = str(r.note, L.text);
    return [{ rowId, ...(note ? { note } : {}), apps: { cuppi: readSnapApp(apps.cuppi), hartley: readSnapApp(apps.hartley), familywall: readSnapApp(apps.familywall) } }];
  });
}

function readReasons(raw: unknown, base: Reason[]): Reason[] {
  const stored = Array.isArray(raw) ? raw.filter(isObj) : [];
  return base.map((r) => {
    const s = stored.find((x) => x.id === r.id);
    const iconUrl = srcOf(s?.iconUrl);
    return {
      ...r,
      title: str(s?.title, L.short) ?? r.title,
      text: str(s?.text, L.line) ?? r.text,
      tile: TILE_COLOURS_LIST.includes(s?.tile as never) ? (s!.tile as Reason['tile']) : r.tile,
      icon: REASON_ICONS.includes(s?.icon as ReasonIcon) ? (s!.icon as ReasonIcon) : r.icon,
      ...(iconUrl ? { iconUrl } : {}),
    };
  });
}

/** What the page shows: the stored document where it is usable, the default everywhere else. */
export function resolveCompare(stored: unknown): CompareContent {
  const d = defaultCompare();
  if (!isObj(stored)) return d;
  const panels = isObj(stored.panels) ? stored.panels : {};
  const prices = isObj(stored.prices) ? stored.prices : {};
  const shots = isObj(stored.shots) ? stored.shots : {};
  const look = isObj(stored.lookCaptions) ? stored.lookCaptions : {};
  const labels = isObj(stored.privacyLabels) ? stored.privacyLabels : {};
  return {
    checkedOn: isoDate(stored.checkedOn) ?? d.checkedOn,
    whyTitle: str(stored.whyTitle, L.short) ?? d.whyTitle,
    whyIntro: str(stored.whyIntro, L.text) ?? d.whyIntro,
    reasons: readReasons(stored.reasons, d.reasons),
    featuresTitle: str(stored.featuresTitle, L.short) ?? d.featuresTitle,
    featuresIntro: textOrEmpty(stored.featuresIntro, L.line) ?? d.featuresIntro,
    priceTitle: str(stored.priceTitle, L.short) ?? d.priceTitle,
    priceIntro: textOrEmpty(stored.priceIntro, L.line) ?? d.priceIntro,
    sourcesTitle: str(stored.sourcesTitle, L.short) ?? d.sourcesTitle,
    privacyTitle: str(stored.privacyTitle, L.short) ?? d.privacyTitle,
    privacyIntro: textOrEmpty(stored.privacyIntro, L.line) ?? d.privacyIntro,
    privacyLabels: {
      tracking: str(labels.tracking, L.short) ?? d.privacyLabels.tracking,
      identifiers: str(labels.identifiers, L.short) ?? d.privacyLabels.identifiers,
      linked: str(labels.linked, L.short) ?? d.privacyLabels.linked,
      notLinked: str(labels.notLinked, L.short) ?? d.privacyLabels.notLinked,
      nothing: str(labels.nothing, L.short) ?? d.privacyLabels.nothing,
    },
    groups: readGroups(stored.groups) ?? d.groups,
    notYet: textOrEmpty(stored.notYet, L.text) ?? d.notYet,
    testNote: str(stored.testNote, L.text) ?? d.testNote,
    panels: { cuppi: readPanel(panels.cuppi, d.panels.cuppi), hartley: readPanel(panels.hartley, d.panels.hartley), familywall: readPanel(panels.familywall, d.panels.familywall) },
    prices: { hartley: readPrice(prices.hartley, d.prices.hartley), familywall: readPrice(prices.familywall, d.prices.familywall) },
    trial: str(stored.trial, L.line) ?? d.trial,
    sources: readSources(stored.sources) ?? d.sources,
    showLook: typeof stored.showLook === 'boolean' ? stored.showLook : d.showLook,
    lookTitle: str(stored.lookTitle, L.short) ?? d.lookTitle,
    lookIntro: textOrEmpty(stored.lookIntro, L.line) ?? d.lookIntro,
    lookCaptions: {
      cuppi: str(look.cuppi, L.line) ?? d.lookCaptions.cuppi,
      hartley: str(look.hartley, L.line) ?? d.lookCaptions.hartley,
      familywall: str(look.familywall, L.line) ?? d.lookCaptions.familywall,
    },
    shots: { cuppi: readShots(shots.cuppi), hartley: readShots(shots.hartley), familywall: readShots(shots.familywall) },
    snapshotsIntro: str(stored.snapshotsIntro, L.text) ?? d.snapshotsIntro,
    snapshots: readSnapshots(stored.snapshots),
  };
}

// ---------------------------------------------------------------------------
// Writing
// ---------------------------------------------------------------------------

/** What goes in the database: the content as plain data, with no undefined (Firestore refuses a field that is undefined) and text trimmed. */
export function storedCompare(content: CompareContent): Record<string, unknown> {
  return JSON.parse(JSON.stringify(content, (_key, value) => (typeof value === 'string' ? value.trim() : value))) as Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Checking a draft
// ---------------------------------------------------------------------------

/** Plain-English problems with a draft being saved (empty when fine). */
export function validateCompare(content: CompareContent): string[] {
  const problems: string[] = [];
  const sourceIds = new Set(content.sources.map((s) => s.id));
  const rows = allRows(content);
  const rowIds = new Set(rows.map((r) => r.id));

  if (!isoDate(content.checkedOn)) problems.push('The "checked on" date needs to be a real date.');
  if (!content.whyTitle.trim()) problems.push('Why Cuppi needs a heading.');
  if (!content.whyIntro.trim()) problems.push('Why Cuppi needs its few lines of introduction.');
  if (!content.lookTitle.trim()) problems.push('“A look inside” needs a heading.');
  if (!content.featuresTitle.trim()) problems.push('The feature matrix needs a heading.');
  if (!content.priceTitle.trim()) problems.push('The price section needs a heading.');
  if (!content.sourcesTitle.trim()) problems.push('The sources section needs a heading.');
  if (!content.privacyTitle.trim()) problems.push('The privacy section needs a heading.');
  if (Object.values(content.privacyLabels).some((l) => !l.trim())) problems.push('Every label on the privacy cards needs some words.');
  for (const app of APP_IDS) if (!content.lookCaptions[app].trim()) problems.push(`The ${app} caption under “A look inside” is empty.`);
  for (const r of content.reasons) if (!r.title.trim() || !r.text.trim()) problems.push('Each Why Cuppi tile needs a title and some words.');

  if (content.groups.length === 0) problems.push('The matrix needs at least one group.');
  if (content.groups.length > L.groups) problems.push(`The matrix holds up to ${L.groups} groups.`);
  if (rows.length > L.rows) problems.push(`The matrix holds up to ${L.rows} rows.`);
  const seenRows = new Set<string>();
  for (const g of content.groups) {
    if (!g.title.trim()) problems.push('A group needs a title.');
    if (g.rows.length === 0) problems.push(`The group "${g.title || 'untitled'}" has no rows. Add one, or remove it.`);
    for (const row of g.rows) {
      const name = row.label.trim() || 'A row';
      if (!row.label.trim()) problems.push('A row needs a name.');
      if (seenRows.has(row.id)) problems.push(`Two rows share the key "${row.id}".`);
      seenRows.add(row.id);
      for (const app of APP_IDS) {
        const cell = row.cells[app];
        if (cell.kind === 'text' && !cell.text?.trim()) problems.push(`${name}: a cell set to "words" has none.`);
      }
      for (const app of RIVALS) {
        const cell = row.cells[app];
        const cited = row.sources[app] ?? [];
        if (cell.kind !== 'tbc' && cited.length === 0) problems.push(`${name}: the ${app === 'hartley' ? 'Hartley' : 'FamilyWall'} cell says something but names no source.`);
        for (const id of cited) if (!sourceIds.has(id)) problems.push(`${name}: it cites a source ("${id}") that is not in the list.`);
      }
    }
  }

  const seenSources = new Set<string>();
  for (const s of content.sources) {
    if (!ID.test(s.id)) problems.push(`A source key must be lower-case letters, numbers and dashes ("${s.id}").`);
    if (seenSources.has(s.id)) problems.push(`Two sources share the key "${s.id}".`);
    seenSources.add(s.id);
    if (!s.label.trim()) problems.push(`The source "${s.id}" needs a name.`);
    if (!isoDate(s.checkedOn)) problems.push(`The source "${s.label || s.id}" needs a real "checked on" date.`);
    if (s.url && !urlOf(s.url)) problems.push(`The source "${s.label || s.id}" needs an address that starts with https:// (or / for a page on this site).`);
    if (s.url && !isExternalUrl(s.url) && !s.url.startsWith('/')) problems.push(`The source "${s.label || s.id}" has an address that is not usable.`);
  }
  if (content.sources.length > L.sources) problems.push(`The list holds up to ${L.sources} sources.`);

  for (const app of APP_IDS) for (const id of content.panels[app].sources) if (!sourceIds.has(id)) problems.push(`The ${app} privacy card cites a source ("${id}") that is not in the list.`);
  for (const app of ['hartley', 'familywall'] as const) {
    const p = content.prices[app];
    if (!(p.monthly >= 0)) problems.push(`The ${app} price needs a number, 0 or more.`);
    for (const id of p.sources) if (!sourceIds.has(id)) problems.push(`The ${app} price cites a source ("${id}") that is not in the list.`);
  }

  for (const app of APP_IDS) {
    const shots = content.shots[app];
    if (shots.length > L.shots) problems.push(`Each app shows up to ${L.shots} screenshots on the page.`);
    if (shots.some((s) => !s.alt.trim())) problems.push(`Every ${app} screenshot on the page needs a description (for people who can't see it).`);
  }

  const seenSnaps = new Set<string>();
  for (const snap of content.snapshots) {
    if (!rowIds.has(snap.rowId)) problems.push(`A snapshot belongs to a row that is no longer in the matrix ("${snap.rowId}"). Remove it.`);
    if (seenSnaps.has(snap.rowId)) problems.push(`There are two snapshots for "${snap.rowId}".`);
    seenSnaps.add(snap.rowId);
    for (const app of APP_IDS) {
      const a = snap.apps[app];
      if (a.shots.length > L.shots) problems.push(`A snapshot holds up to ${L.shots} screenshots per app.`);
      if (a.shots.some((s) => !s.alt.trim())) problems.push(`Every snapshot screenshot needs a description ("${snap.rowId}").`);
      if (a.testedOn && !isoDate(a.testedOn)) problems.push(`A snapshot's date needs to be a real date ("${snap.rowId}").`);
    }
  }
  if (content.snapshots.length > L.snapshots) problems.push(`The snapshots page holds up to ${L.snapshots} snapshots.`);

  return [...new Set(problems)];
}

/** What a source's removal does to a draft: it goes from the list and from every claim that cited it. */
export function withoutSource(content: CompareContent, id: string): CompareContent {
  const keep = (ids: string[]) => ids.filter((x) => x !== id);
  return {
    ...content,
    sources: content.sources.filter((s) => s.id !== id),
    groups: content.groups.map((g) => ({
      ...g,
      rows: g.rows.map((r) => ({ ...r, sources: { hartley: keep(r.sources.hartley ?? []), familywall: keep(r.sources.familywall ?? []) } })),
    })),
    panels: {
      cuppi: { ...content.panels.cuppi, sources: keep(content.panels.cuppi.sources) },
      hartley: { ...content.panels.hartley, sources: keep(content.panels.hartley.sources) },
      familywall: { ...content.panels.familywall, sources: keep(content.panels.familywall.sources) },
    },
    prices: {
      hartley: { ...content.prices.hartley, sources: keep(content.prices.hartley.sources) },
      familywall: { ...content.prices.familywall, sources: keep(content.prices.familywall.sources) },
    },
  };
}

export type { AppId };
