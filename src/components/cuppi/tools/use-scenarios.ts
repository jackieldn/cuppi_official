'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { addScenario, initialState, readScenarios, removeScenario, renameScenario, setField, writeScenarios, type Fields, type ScenarioState } from '@/lib/tools/scenario-params';

/**
 * The calculator's boxes, kept for up to five scenarios (see scenario-params.ts), one of which is selected and edited at
 * a time. Everything is the text people typed. The scenarios are mirrored into the address bar (?rate=5.5&n=2&rate_2=4.1)
 * so a comparison can be shared or bookmarked; only values that differ from the defaults go in it. The page always starts
 * from the defaults, so the server's page and the browser's first paint agree, and then picks up anything in the address.
 *
 * `shared` boxes belong to the comparison, not to a scenario (like how many years to compare costs over).
 * The numbers never leave the browser: the address is changed in place (history.replaceState), not sent anywhere.
 */
export function useScenarios<T extends Fields, S extends Fields = Record<string, never>>(defaults: T, options: { label: string; shared?: S }) {
  const { label } = options;
  const defaultsRef = useRef(defaults);
  const sharedDefaultsRef = useRef((options.shared ?? {}) as S);
  const [state, setState] = useState<ScenarioState<T>>(() => initialState(defaults, label));
  const [shared, setShared] = useState<S>(sharedDefaultsRef.current);
  const [ready, setReady] = useState(false);

  // Once, after the page is shown: read what the address carries.
  useEffect(() => {
    const read = readScenarios(window.location.search, defaultsRef.current, sharedDefaultsRef.current, label);
    setState(read.state);
    setShared(read.shared);
    setReady(true);
  }, [label]);

  // After that, keep the address in step.
  useEffect(() => {
    if (!ready) return;
    const query = writeScenarios(state, defaultsRef.current, shared, sharedDefaultsRef.current, label);
    try {
      window.history.replaceState(window.history.state, '', `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`);
    } catch {
      // A browser that will not let the address change is not worth an error: the calculator still works.
    }
  }, [state, shared, ready, label]);

  const set = useCallback((key: keyof T & string, value: string) => setState((s) => setField(s, key, value)), []);
  const select = useCallback((index: number) => setState((s) => (index >= 0 && index < s.list.length ? { ...s, active: index } : s)), []);
  const add = useCallback(() => setState((s) => addScenario(s, label)), [label]);
  const remove = useCallback((index: number) => setState((s) => removeScenario(s, index)), []);
  const rename = useCallback((index: number, name: string) => setState((s) => renameScenario(s, index, name)), []);
  const setSharedValue = useCallback((key: keyof S & string, value: string) => setShared((x) => ({ ...x, [key]: value })), []);
  const reset = useCallback(() => {
    setState(initialState(defaultsRef.current, label));
    setShared(sharedDefaultsRef.current);
  }, [label]);

  const changed = writeScenarios(state, defaultsRef.current, shared, sharedDefaultsRef.current, label) !== '';
  return {
    /** The selected scenario's boxes. */
    values: state.list[state.active],
    /** Every scenario's boxes. */
    all: state.list,
    names: state.names,
    active: state.active,
    count: state.list.length,
    shared,
    set,
    select,
    add,
    remove,
    rename,
    setShared: setSharedValue,
    reset,
    changed,
  };
}
