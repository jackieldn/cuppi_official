import 'server-only';
import { firestore } from '@/firebase/server';
import { readOverride, type FeatureOverride } from './features-types';
import { resolveMenu, type MenuSettings } from './menu-settings';
import { APP_STORE_URL } from './invite';
import { defaultPageStatus, resolvePageStatus, type PageStatus } from './page-status';
import { defaultHeroHeight, defaultHeroSettings, resolveHeroHeight, resolveHeroList, type HeroHeight, type HeroSettings } from './home-hero-settings';
import { resolveDisclaimers, type Disclaimer } from './disclaimers';
import { resolveBanners, type Banner } from './banners';
import { resolveHomeVideo, type HomeVideo } from './home-video';
import { emptyColourSettings, resolveColours, type ColourSettings } from './theme-colours';
import { resolveTools, type ResolvedTool } from './tools/settings';

// What the admin has changed about the Cuppi site, read on the server. Four collections, all
// publicly readable and admin-writable (firestore.rules):
//   cuppi_menu/main        the top menu: links, their order and switches, the Download button
//   cuppi_features/{slug}  edits to a feature, or a whole new one (see mergeFeatures)
//   cuppi_pages/status     which sections are live and which show "refresh in progress" (page-status.ts)
//   cuppi_home/hero        the home page heroes (up to five): template, words, colour, pattern, phone (home-hero-settings.ts)
//   cuppi_home/disclaimers the disclaimers behind the (i) icons in page text (disclaimers.ts)
//   cuppi_home/banners     the temporary banners under the menu, with their dates (banners.ts)
//   cuppi_home/colours     the site's base colours, light and dark, when switched on (theme-colours.ts)
//   cuppi_home/video       the latest advertisement under "What's new" on the home page (home-video.ts)
//   cuppi_home/tools       the Tools: which are live, in the menu, their tile colour and icon, and the order (tools/settings.ts)
//   cuppi_home/fan         the icon banner: which features slide out of Cuppi's icon, and in what order (fan-settings.ts)
//   cuppi_home/plans       the Plans page: the prices and a Free / Pro table per feature (plans-settings.ts)
//   cuppi_home/compare     the comparison page and its snapshots: facts, sources, screenshots (compare-settings.ts)
//
// The site must never be down because this is: every read has a short timeout, any failure
// gives "nothing changed" (the seed and the default menu), and the answer, good or bad, is
// remembered for a while so a slow or unreachable database costs one wait, not one per page.

const TIMEOUT_MS = 3000;
const GOOD_FOR_MS = 30_000;
const BAD_FOR_MS = 60_000;

type Memo<T> = { at: number; ttl: number; value: T; pending?: Promise<T> };

// `memo.pending` makes everything that asks while a read is under way (the header, the footer
// and the page all ask at once) share that one read.
function remembered<T>(memo: { current?: Memo<T> }, empty: T, read: () => Promise<T>): Promise<T> {
  const m = memo.current;
  if (m && Date.now() - m.at < m.ttl) return Promise.resolve(m.value);
  if (m?.pending) return m.pending;

  const pending = (async () => {
    try {
      const value = await Promise.race([
        read(),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timed out')), TIMEOUT_MS)),
      ]);
      memo.current = { at: Date.now(), ttl: GOOD_FOR_MS, value };
      return value;
    } catch (error) {
      console.error('Cuppi site settings could not be read, using the defaults:', (error as Error).message);
      // Keep the last good answer if there is one; otherwise the defaults.
      const value = m?.value ?? empty;
      memo.current = { at: Date.now(), ttl: BAD_FOR_MS, value };
      return value;
    }
  })();
  memo.current = { at: m?.at ?? 0, ttl: m?.ttl ?? 0, value: m?.value ?? empty, pending };
  return pending;
}

const featureMemo: { current?: Memo<FeatureOverride[]> } = {};
const menuMemo: { current?: Memo<MenuSettings> } = {};
const pagesMemo: { current?: Memo<PageStatus> } = {};
const heroMemo: { current?: Memo<HeroSettings[]> } = {};
const heroHeightMemo: { current?: Memo<HeroHeight> } = {};
const fanMemo: { current?: Memo<unknown> } = {};
const disclaimerMemo: { current?: Memo<Disclaimer[]> } = {};
const bannerMemo: { current?: Memo<Banner[]> } = {};
const homeVideoMemo: { current?: Memo<HomeVideo> } = {};
const coloursMemo: { current?: Memo<ColourSettings> } = {};
const toolsMemo: { current?: Memo<ResolvedTool[]> } = {};
const plansMemo: { current?: Memo<unknown> } = {};
const compareMemo: { current?: Memo<unknown> } = {};

export function getFeatureOverrides(): Promise<FeatureOverride[]> {
  return remembered(featureMemo, [], async () => {
    const snap = await firestore.collection('cuppi_features').get();
    return snap.docs.map((d) => readOverride(d.id, d.data())).filter((o): o is FeatureOverride => o !== null);
  });
}

export function getMenuSettings(): Promise<MenuSettings> {
  return remembered(menuMemo, resolveMenu(null, APP_STORE_URL), async () => {
    const snap = await firestore.collection('cuppi_menu').doc('main').get();
    return resolveMenu(snap.exists ? snap.data() : null, APP_STORE_URL);
  });
}

export function getPageStatus(): Promise<PageStatus> {
  return remembered(pagesMemo, defaultPageStatus(), async () => {
    const snap = await firestore.collection('cuppi_pages').doc('status').get();
    return resolvePageStatus(snap.exists ? snap.data() : null);
  });
}

export function getHeroList(): Promise<HeroSettings[]> {
  return remembered(heroMemo, [defaultHeroSettings()], async () => {
    const snap = await firestore.collection('cuppi_home').doc('hero').get();
    return resolveHeroList(snap.exists ? snap.data() : null);
  });
}

/** How tall the home heroes may be on each screen size (the slideshow's own setting, saved beside the heroes). No limit when none is saved or the database cannot be read. */
export function getHeroHeight(): Promise<HeroHeight> {
  return remembered(heroHeightMemo, defaultHeroHeight(), async () => {
    const snap = await firestore.collection('cuppi_home').doc('hero').get();
    return resolveHeroHeight(snap.exists ? snap.data() : null);
  });
}

/** The disclaimers behind the (i) icons in page text. Empty when none are saved or the database cannot be read (a tag then shows nothing). */
export function getDisclaimers(): Promise<Disclaimer[]> {
  return remembered(disclaimerMemo, [], async () => {
    const snap = await firestore.collection('cuppi_home').doc('disclaimers').get();
    return resolveDisclaimers(snap.exists ? snap.data() : null);
  });
}

/** Every banner the admin has saved, past, current and scheduled (pickBanner chooses today's). Empty when none or the database cannot be read. */
export function getBanners(): Promise<Banner[]> {
  return remembered(bannerMemo, [], async () => {
    const snap = await firestore.collection('cuppi_home').doc('banners').get();
    return resolveBanners(snap.exists ? snap.data() : null);
  });
}

/** The home page's advertisement video (see home-video.ts). Nothing saved, or an unreadable database, gives the empty default, which shows no section. */
export function getHomeVideo(): Promise<HomeVideo> {
  return remembered(homeVideoMemo, resolveHomeVideo(null), async () => {
    const snap = await firestore.collection('cuppi_home').doc('video').get();
    return resolveHomeVideo(snap.exists ? snap.data() : null);
  });
}

/** The admin's colour changes (see theme-colours.ts). Nothing saved, or an unreadable database, gives the designed palette. */
export function getColours(): Promise<ColourSettings> {
  return remembered(coloursMemo, emptyColourSettings(), async () => {
    const snap = await firestore.collection('cuppi_home').doc('colours').get();
    return resolveColours(snap.exists ? snap.data() : null);
  });
}

/** The icon banner's stored document, as it is (null when nothing is saved). Read it through resolveFan / applyFan. */
export function getFanStored(): Promise<unknown> {
  return remembered<unknown>(fanMemo, null, async () => {
    const snap = await firestore.collection('cuppi_home').doc('fan').get();
    return snap.exists ? snap.data() : null;
  });
}

/** Every tool with what the admin has set for it, in the admin's order (see tools/settings.ts). Nothing saved, or an unreadable database, gives every tool live and in the menu. */
export function getTools(): Promise<ResolvedTool[]> {
  return remembered(toolsMemo, resolveTools(null), async () => {
    const snap = await firestore.collection('cuppi_home').doc('tools').get();
    return resolveTools(snap.exists ? snap.data() : null);
  });
}

/** The Plans page's stored document, as it is (null when nothing is saved). Read it through resolvePlans. */
export function getPlansStored(): Promise<unknown> {
  return remembered<unknown>(plansMemo, null, async () => {
    const snap = await firestore.collection('cuppi_home').doc('plans').get();
    return snap.exists ? snap.data() : null;
  });
}

/** The comparison page's stored document, as it is (null when nothing is saved). Read it through resolveCompare. */
export function getCompareStored(): Promise<unknown> {
  return remembered<unknown>(compareMemo, null, async () => {
    const snap = await firestore.collection('cuppi_home').doc('compare').get();
    return snap.exists ? snap.data() : null;
  });
}
