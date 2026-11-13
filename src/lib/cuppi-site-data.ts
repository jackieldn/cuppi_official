import 'server-only';
import { firestore } from '@/firebase/server';
import { readOverride, type FeatureOverride } from './features-types';
import { resolveMenu, type MenuSettings } from './menu-settings';
import { APP_STORE_URL } from './invite';
import { defaultPageStatus, resolvePageStatus, type PageStatus } from './page-status';
import { defaultHeroSettings, resolveHeroSettings, type HeroSettings } from './home-hero-settings';

// What the admin has changed about the Cuppi site, read on the server. Four collections, all
// publicly readable and admin-writable (firestore.rules):
//   cuppi_menu/main        the top menu: links, their order and switches, the Download button
//   cuppi_features/{slug}  edits to a feature, or a whole new one (see mergeFeatures)
//   cuppi_pages/status     which sections are live and which show "refresh in progress" (page-status.ts)
//   cuppi_home/hero        the home page hero: template, words, colour, pattern, phone (home-hero-settings.ts)
//   cuppi_home/fan         the icon banner: which features slide out of Cuppi's icon, and in what order (fan-settings.ts)
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
const heroMemo: { current?: Memo<HeroSettings> } = {};
const fanMemo: { current?: Memo<unknown> } = {};

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

export function getHeroSettings(): Promise<HeroSettings> {
  return remembered(heroMemo, defaultHeroSettings(), async () => {
    const snap = await firestore.collection('cuppi_home').doc('hero').get();
    return resolveHeroSettings(snap.exists ? snap.data() : null);
  });
}

/** The icon banner's stored document, as it is (null when nothing is saved). Read it through resolveFan / applyFan. */
export function getFanStored(): Promise<unknown> {
  return remembered<unknown>(fanMemo, null, async () => {
    const snap = await firestore.collection('cuppi_home').doc('fan').get();
    return snap.exists ? snap.data() : null;
  });
}
