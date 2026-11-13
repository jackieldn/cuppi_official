// Light / dark / auto for cuppi.co.uk.
//
// Three things cooperate, so a page never flashes the wrong colours:
//   1. THEME_SCRIPT runs in <head>, before anything paints. It reads the saved choice and sets
//      three things on <html>: data-theme-pref (what the visitor chose: light, dark or auto),
//      data-theme (what that resolves to right now) and the `dark` class for Tailwind's dark:.
//   2. globals.css keys the dark palette off html[data-theme='dark'].
//   3. The footer's ThemeToggle changes the choice at runtime through setThemePref.
//
// "auto" means follow the device, live: if the OS flips to dark at sunset, the site follows.

export const THEME_KEY = 'cuppi-theme';

export type ThemePref = 'light' | 'dark' | 'auto';
export type ResolvedTheme = 'light' | 'dark';

/** In the order the toggle shows them. */
export const THEME_PREFS: readonly ThemePref[] = ['light', 'auto', 'dark'];

// The page colour in each theme, for the browser's own chrome (the address bar on a phone).
// Keep in step with --c-paper in globals.css.
export const THEME_COLOURS: Record<ResolvedTheme, string> = { light: '#FBF4E6', dark: '#241812' };

/** Anything unexpected (nothing saved, an old value, a tampered one) means "auto". */
export function parseThemePref(value: unknown): ThemePref {
  return value === 'light' || value === 'dark' ? value : 'auto';
}

export function resolveTheme(pref: ThemePref, systemPrefersDark: boolean): ResolvedTheme {
  if (pref === 'auto') return systemPrefersDark ? 'dark' : 'light';
  return pref;
}

/**
 * Runs before first paint (see the layout). Plain ES5 in a string, because it is inlined into the
 * HTML, so it cannot be bundled. It does the same as readSavedPref + applyTheme below, and must
 * never throw: storage can be blocked, and a broken script here would break the whole page.
 */
export const THEME_SCRIPT = `(function(){var d=document.documentElement,p;try{p=localStorage.getItem('${THEME_KEY}')}catch(e){}if(p!=='light'&&p!=='dark')p='auto';var t=p==='auto'?(window.matchMedia&&matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'):p;d.setAttribute('data-theme-pref',p);d.setAttribute('data-theme',t);if(t==='dark')d.classList.add('dark');else d.classList.remove('dark')})()`;

// ---- Browser side ---------------------------------------------------------------------------

const DARK_QUERY = '(prefers-color-scheme: dark)';
const listeners = new Set<() => void>();
let changingTimer: ReturnType<typeof setTimeout> | undefined;

function readSavedPref(): ThemePref {
  try {
    return parseThemePref(localStorage.getItem(THEME_KEY));
  } catch {
    return 'auto'; // storage blocked (private mode, strict settings): nothing to remember
  }
}

/** The choice currently in force, as the head script set it. Falls back to "auto" on the server. */
export function getThemePref(): ThemePref {
  if (typeof document === 'undefined') return 'auto';
  return parseThemePref(document.documentElement.getAttribute('data-theme-pref'));
}

/** Point the browser's own chrome (theme-color meta) at the page colour. */
export function syncBrowserChrome(theme: ResolvedTheme) {
  document.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.setAttribute('content', THEME_COLOURS[theme]));
}

/** Put a choice into effect on the page. Does not save it. */
function applyTheme(pref: ThemePref, { animate }: { animate: boolean }) {
  const root = document.documentElement;
  const theme = resolveTheme(pref, window.matchMedia(DARK_QUERY).matches);

  // Let colours ease from one palette to the other instead of snapping. The class is only there
  // for a moment, so it never fights the site's own hover and scroll transitions.
  if (animate) {
    root.classList.add('theme-changing');
    clearTimeout(changingTimer);
    changingTimer = setTimeout(() => root.classList.remove('theme-changing'), 450);
  }

  root.setAttribute('data-theme-pref', pref);
  root.setAttribute('data-theme', theme);
  root.classList.toggle('dark', theme === 'dark');
  syncBrowserChrome(theme);
}

/** The visitor picked one. Remember it and apply it. */
export function setThemePref(pref: ThemePref) {
  try {
    if (pref === 'auto') localStorage.removeItem(THEME_KEY);
    else localStorage.setItem(THEME_KEY, pref);
  } catch {
    // Not saved, but it still applies until they leave.
  }
  applyTheme(pref, { animate: true });
  listeners.forEach((l) => l());
}

/**
 * For useSyncExternalStore. Also keeps the page honest about things that change outside the
 * toggle: the device switching between light and dark while "auto" is chosen, and the choice
 * being changed in another tab.
 */
export function subscribeThemePref(onChange: () => void) {
  listeners.add(onChange);

  const media = window.matchMedia(DARK_QUERY);
  const onSystem = () => {
    if (getThemePref() !== 'auto') return;
    applyTheme('auto', { animate: true });
    onChange();
  };
  const onStorage = (e: StorageEvent) => {
    if (e.key !== null && e.key !== THEME_KEY) return;
    applyTheme(readSavedPref(), { animate: true });
    onChange();
  };
  media.addEventListener('change', onSystem);
  window.addEventListener('storage', onStorage);

  return () => {
    listeners.delete(onChange);
    media.removeEventListener('change', onSystem);
    window.removeEventListener('storage', onStorage);
  };
}
