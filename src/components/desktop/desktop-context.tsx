'use client';

// The "desktop" easter egg: the page can leave full screen and become a
// macOS-style window on a wallpaper, which can be dragged, resized,
// minimised to the Dock, closed, or zoomed back to full screen.
//
// This provider holds that state. <PageWindow> draws it and the Dock reads it.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type MutableRefObject,
} from 'react';

import { DEFAULT_WALLPAPER, isWallpaperId, type WallpaperId } from './wallpapers';

export type WindowMode = 'full' | 'window';
export type WindowState = 'open' | 'minimised' | 'closed';
/** Small apps that open in their own windows on the desktop. */
export type AppId = 'wallpaper' | 'music' | 'journal';
/** Everything that can be in front: the page window or an app. */
export type WindowId = 'page' | AppId;
/** The Time Machine (the menu bar clock): which era the desktop is in. */
export type Era = 'now' | '2006' | '1997';

/**
 * Today's date and time, moved to another year: the Time Machine only
 * travels in years. 29 February becomes the 28th in years without one.
 */
export function inYear(year: number, from = new Date()): Date {
  const d = new Date(from);
  const day = Math.min(d.getDate(), new Date(year, d.getMonth() + 1, 0).getDate());
  return new Date(year, d.getMonth(), day, d.getHours(), d.getMinutes(), d.getSeconds(), d.getMilliseconds());
}

/** "4 November 2006", for the Time Machine's menus. */
export const eraDateLabel = (year: number) =>
  inYear(year).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export const TITLE_BAR_HEIGHT = 36;
export const MENU_BAR_HEIGHT = 28;
export const ZOOM_MS = 450;
export const MIN_W = 380;
export const MIN_H = 260;
// The desktop needs a big enough screen and a mouse or trackpad. Phones and
// tablets never see it: the page is always full screen there.
const DESKTOP_QUERY = '(min-width: 768px) and (hover: hover) and (pointer: fine)';

// Full screen as a window rect: the title bar sits just above the viewport, so
// the page content lines up exactly with where it is in full-screen mode.
export function fullRect(): Rect {
  return { x: 0, y: -TITLE_BAR_HEIGHT, w: window.innerWidth, h: window.innerHeight + TITLE_BAR_HEIGHT };
}

function defaultRect(): Rect {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  // Fit between the menu bar and the Dock.
  const free = vh - MENU_BAR_HEIGHT - 110;
  const w = Math.round(Math.min(1180, vw * 0.78));
  const h = Math.round(Math.min(860, free * 0.9));
  return { x: Math.round((vw - w) / 2), y: MENU_BAR_HEIGHT + Math.max(12, Math.round((free - h) / 2)), w, h };
}

// Keep at least the title bar reachable after the viewport changes size.
export function clampRect(r: Rect): Rect {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const w = Math.min(Math.max(r.w, MIN_W), vw);
  const h = Math.min(Math.max(r.h, MIN_H), vh - MENU_BAR_HEIGHT);
  return {
    w,
    h,
    x: Math.min(Math.max(r.x, 120 - w), vw - 120),
    // Windows never slide under the menu bar.
    y: Math.min(Math.max(r.y, MENU_BAR_HEIGHT), vh - TITLE_BAR_HEIGHT - 8),
  };
}

interface DesktopValue {
  /** This device gets the desktop at all (not phones or tablets). */
  available: boolean;
  mode: WindowMode;
  windowState: WindowState;
  rect: Rect;
  /** True while a zoom (full screen <-> window) is animating the rect. */
  zooming: boolean;
  /** Square corners: the window is sitting exactly over the full screen. */
  flush: boolean;
  scrollerRef: MutableRefObject<HTMLDivElement | null>;
  /** Scroll position to apply once the mode change has rendered. */
  pendingScrollRef: MutableRefObject<number | null>;
  setRect: (r: Rect) => void;
  /** Green button. */
  toggleZoom: () => void;
  /** Yellow button. */
  minimise: () => void;
  /** Red button. */
  close: () => void;
  /** Dock: bring the window back from minimised or closed. */
  open: () => void;

  wallpaper: WallpaperId;
  setWallpaper: (id: WallpaperId) => void;
  /** Apps with an open window, in the order they were opened. */
  openApps: AppId[];
  /** Opens an app, or brings it to the front if it's already open. */
  openApp: (id: AppId) => void;
  closeApp: (id: AppId) => void;
  /** Open apps whose window is minimised to the Dock. */
  minimisedApps: AppId[];
  /** Yellow button on an app window: shrink it to the Dock. Opening the app again restores it. */
  minimiseApp: (id: AppId) => void;
  /** Bring a window to the front. */
  focus: (id: WindowId) => void;
  /** Stacking order for a window: higher is in front. */
  zIndexFor: (id: WindowId) => number;
  /** The window in front, which gets the active look. */
  frontmost: WindowId;
  era: Era;
  setEra: (era: Era) => void;
}

const WALLPAPER_KEY = 'desktop-wallpaper';
// Windows stack between the wallpaper (z-0) and the menu bar (z-40).
const BASE_Z = 10;

const DesktopContext = createContext<DesktopValue | null>(null);

const nextFrame = (fn: () => void) => requestAnimationFrame(() => requestAnimationFrame(fn));

export function DesktopProvider({ children }: { children: ReactNode }) {
  const [available, setAvailable] = useState(false);
  const [mode, setMode] = useState<WindowMode>('full');
  const [windowState, setWindowState] = useState<WindowState>('open');
  const [rect, setRectState] = useState<Rect>({ x: 0, y: 0, w: 0, h: 0 });
  const [zooming, setZooming] = useState(false);
  const [flush, setFlush] = useState(true);
  const [wallpaper, setWallpaperState] = useState<WallpaperId>(DEFAULT_WALLPAPER);
  const [openApps, setOpenApps] = useState<AppId[]>([]);
  const [minimisedApps, setMinimisedApps] = useState<AppId[]>([]);
  // Back to front.
  const [stack, setStack] = useState<WindowId[]>(['page']);
  const [era, setEra] = useState<Era>('now');

  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const pendingScrollRef = useRef<number | null>(null);
  // Where the window was last time it was a window, so zooming out returns there.
  const lastRectRef = useRef<Rect | null>(null);
  // Minimised or closed straight from full screen: restoring goes back to full screen.
  const restoreToFullRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  const later = (fn: () => void, ms: number) => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(fn, ms);
  };

  const setRect = useCallback((r: Rect) => {
    setRectState(r);
    lastRectRef.current = r;
  }, []);

  // Turns the full-screen page into a window sitting exactly over the viewport,
  // without any visible change yet. Everything else animates from there.
  const detach = useCallback(() => {
    pendingScrollRef.current = window.scrollY;
    setZooming(false);
    setFlush(true);
    setRectState(fullRect());
    setMode('window');
  }, []);

  const goFull = useCallback(() => {
    setEra('now');
    pendingScrollRef.current = scrollerRef.current?.scrollTop ?? 0;
    setZooming(false);
    setMode('full');
    setWindowState('open');
  }, []);

  const toggleZoom = useCallback(() => {
    if (mode === 'full') {
      detach();
      nextFrame(() => {
        setZooming(true);
        setFlush(false);
        setRectState(lastRectRef.current ? clampRect(lastRectRef.current) : defaultRect());
        later(() => setZooming(false), ZOOM_MS);
      });
    } else {
      setZooming(true);
      setRectState(fullRect());
      setFlush(true);
      later(goFull, ZOOM_MS);
    }
  }, [mode, detach, goFull]);

  const hide = useCallback(
    (state: Exclude<WindowState, 'open'>) => {
      if (mode === 'full') {
        restoreToFullRef.current = true;
        detach();
        nextFrame(() => setWindowState(state));
      } else {
        restoreToFullRef.current = false;
        setWindowState(state);
      }
    },
    [mode, detach],
  );

  const minimise = useCallback(() => hide('minimised'), [hide]);
  const close = useCallback(() => hide('closed'), [hide]);

  const open = useCallback(() => {
    if (windowState === 'open') return;
    if (windowState === 'closed' && restoreToFullRef.current) {
      // A closed window reopens as a window, like a freshly launched app.
      restoreToFullRef.current = false;
      setFlush(false);
      setRectState(lastRectRef.current ? clampRect(lastRectRef.current) : defaultRect());
    }
    setWindowState('open');
    if (restoreToFullRef.current) {
      restoreToFullRef.current = false;
      later(goFull, ZOOM_MS);
    }
  }, [windowState, goFull]);

  // Phones, tablets and narrow windows: no desktop, always full screen.
  useEffect(() => {
    const mq = window.matchMedia(DESKTOP_QUERY);
    const onChange = () => setAvailable(mq.matches);
    onChange();
    mq.addEventListener('change', onChange);
    // Belt and braces: not every browser fires `change` when the device switches.
    window.addEventListener('resize', onChange);
    return () => {
      mq.removeEventListener('change', onChange);
      window.removeEventListener('resize', onChange);
    };
  }, []);

  useEffect(() => {
    if (!available && mode === 'window') goFull();
  }, [available, mode, goFull]);

  // Keep the window on screen when the browser is resized.
  useEffect(() => {
    if (mode !== 'window') return;
    const onResize = () => setRectState((r) => (flush ? fullRect() : clampRect(r)));
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [mode, flush]);

  // The desktop itself never scrolls; only the window's content does.
  useEffect(() => {
    if (mode !== 'window') return;
    const html = document.documentElement;
    const prev = html.style.overflow;
    html.style.overflow = 'hidden';
    return () => {
      html.style.overflow = prev;
    };
  }, [mode]);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  // The wallpaper is a per-visitor preference, remembered in this browser only.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(WALLPAPER_KEY);
      if (saved && isWallpaperId(saved)) setWallpaperState(saved);
    } catch {
      // Storage blocked (private mode and so on): keep the default.
    }
  }, []);

  const setWallpaper = useCallback((id: WallpaperId) => {
    setWallpaperState(id);
    try {
      localStorage.setItem(WALLPAPER_KEY, id);
    } catch {
      // Not remembered, but still applied for this visit.
    }
  }, []);

  const focus = useCallback((id: WindowId) => {
    setStack((s) => (s[s.length - 1] === id ? s : [...s.filter((w) => w !== id), id]));
  }, []);

  const openApp = useCallback(
    (id: AppId) => {
      setOpenApps((apps) => (apps.includes(id) ? apps : [...apps, id]));
      // Opening a minimised app brings its window back from the Dock.
      setMinimisedApps((apps) => (apps.includes(id) ? apps.filter((a) => a !== id) : apps));
      focus(id);
    },
    [focus],
  );

  const closeApp = useCallback((id: AppId) => {
    setOpenApps((apps) => apps.filter((a) => a !== id));
    setMinimisedApps((apps) => apps.filter((a) => a !== id));
    setStack((s) => s.filter((w) => w !== id));
  }, []);

  const minimiseApp = useCallback((id: AppId) => {
    setMinimisedApps((apps) => (apps.includes(id) ? apps : [...apps, id]));
    // Out of the stack, so the window behind it becomes the active one.
    setStack((s) => s.filter((w) => w !== id));
  }, []);

  const zIndexFor = useCallback((id: WindowId) => BASE_Z + Math.max(0, stack.indexOf(id)), [stack]);
  const frontmost = stack[stack.length - 1] ?? 'page';

  const value = useMemo<DesktopValue>(
    () => ({
      available,
      mode,
      windowState,
      rect,
      zooming,
      flush,
      scrollerRef,
      pendingScrollRef,
      setRect,
      toggleZoom,
      minimise,
      close,
      open,
      wallpaper,
      setWallpaper,
      openApps,
      openApp,
      closeApp,
      minimisedApps,
      minimiseApp,
      focus,
      zIndexFor,
      frontmost,
      era,
      setEra,
    }),
    [
      available,
      mode,
      windowState,
      rect,
      zooming,
      flush,
      setRect,
      toggleZoom,
      minimise,
      close,
      open,
      wallpaper,
      setWallpaper,
      openApps,
      openApp,
      closeApp,
      minimisedApps,
      minimiseApp,
      focus,
      zIndexFor,
      frontmost,
      era,
    ],
  );

  return <DesktopContext.Provider value={value}>{children}</DesktopContext.Provider>;
}

export function useDesktop() {
  const ctx = useContext(DesktopContext);
  if (!ctx) throw new Error('useDesktop must be used inside <DesktopProvider>');
  return ctx;
}
