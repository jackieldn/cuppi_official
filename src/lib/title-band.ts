import { useSyncExternalStore } from 'react';

/**
 * The lighter band behind a project's title and details lives in a layer in the layout
 * (TitleBandLayer), not in the project page itself. That way it survives the route
 * change and can fade out *after* the page is gone, instead of vanishing with it.
 *
 * The project page reports how tall the band should be with showBand() and releases it
 * with hideBand() when it unmounts.
 */
export interface BandState {
  on: boolean;
  /** Height in px from the top of the document; kept while fading out. */
  height: number;
}

let state: BandState = { on: false, height: 0 };
const listeners = new Set<() => void>();

function set(next: BandState) {
  if (next.on === state.on && next.height === state.height) return;
  state = next;
  listeners.forEach((l) => l());
}

export function showBand(height: number) {
  set({ on: true, height });
}

export function hideBand() {
  set({ ...state, on: false });
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useBand(): BandState {
  return useSyncExternalStore(
    subscribe,
    () => state,
    () => state
  );
}
