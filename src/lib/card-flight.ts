import { useSyncExternalStore } from 'react';

/**
 * Shared-element "flight" between a works card and the project page's cover art.
 *
 * Forward: clicking a card calls startFlight(); CardFlightLayer (mounted in the
 * layout, so it survives the page change) draws a copy of the card on top of
 * everything. Once the project page has its cover on screen it calls landFlight(),
 * and the layer glides the copy onto it, then clears the flight.
 *
 * Back: leaving a project page for /works calls startReturnFlight(), which does the
 * same in reverse: the cover's copy flies to that project's card in the grid.
 */
/**
 * A works card's picture rests slightly zoomed (the margin its hover parallax moves
 * in). The project cover doesn't, so the flying copy eases between the two.
 */
export const CARD_IMG_SCALE = 1.08;

export interface FlightRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface Flight {
  id: number;
  slug: string;
  src: string;
  rect: FlightRect;
  radius: number;
  /** forward: card -> cover.  back: cover -> card. */
  direction: 'forward' | 'back';
  /** Zoom of the picture inside the copy at take-off and at touch-down. */
  imgScaleFrom: number;
  imgScaleTo: number;
  phase: 'held' | 'flying';
}

// If the destination never shows up (error, locked project, navigated away), give up.
const GIVE_UP_MS = 8000;

let flight: Flight | null = null;
let target: (() => HTMLElement | null) | null = null;
let counter = 0;
let giveUpTimer: ReturnType<typeof setTimeout> | undefined;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

export function startFlight(
  next: Omit<Flight, 'id' | 'phase' | 'direction' | 'imgScaleFrom' | 'imgScaleTo'> &
    Partial<Pick<Flight, 'direction' | 'imgScaleFrom' | 'imgScaleTo'>>
) {
  clearTimeout(giveUpTimer);
  flight = { direction: 'forward', imgScaleFrom: 1, imgScaleTo: 1, ...next, id: ++counter, phase: 'held' };
  target = null;
  giveUpTimer = setTimeout(clearFlight, GIVE_UP_MS);
  emit();
}

/**
 * Leaving a project page for the works grid: send a copy of the cover back to its
 * card. Does nothing if there's no visible cover (locked project, scrolled away,
 * reduced motion) or a flight is already under way.
 */
export function startReturnFlight(slug: string) {
  if (flight || typeof window === 'undefined') return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const cover = document.querySelector<HTMLElement>('[data-flight-cover]');
  const img = cover?.querySelector('img');
  if (!cover || !img?.currentSrc) return;
  const r = cover.getBoundingClientRect();
  if (r.bottom <= 0 || r.top >= window.innerHeight) return;
  startFlight({
    slug,
    src: img.currentSrc,
    rect: { left: r.left, top: r.top, width: r.width, height: r.height },
    radius: 16, // rounded-2xl
    direction: 'back',
    imgScaleFrom: 1,
    imgScaleTo: CARD_IMG_SCALE,
  });
}

/** The destination calls this once its target is on screen and loaded. */
export function landFlight(slug: string, getTarget: () => HTMLElement | null) {
  if (!flight || flight.slug !== slug || flight.phase !== 'held') return;
  target = getTarget;
  flight = { ...flight, phase: 'flying' };
  emit();
}

export function clearFlight() {
  clearTimeout(giveUpTimer);
  if (!flight) return;
  flight = null;
  target = null;
  emit();
}

export const getFlightTarget = () => target?.() ?? null;

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useFlight(): Flight | null {
  return useSyncExternalStore(
    subscribe,
    () => flight,
    () => null
  );
}
