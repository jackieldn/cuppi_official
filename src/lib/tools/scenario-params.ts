// Scenarios: a calculator holds one to five sets of its boxes, so people can compare. This is how they are kept in
// the address (so a comparison can be shared) and read back. Pure functions with no imports, so the unit tests can
// load them from Node.
//
// The first scenario uses the box names as they are (?rate=5.5), so a link to a single calculator looks the way it
// always did; the others add a number (?rate_2=4.1). Only boxes that differ from the defaults are written. Alongside:
//   n      how many scenarios (left out when it is 1)
//   a      which one is selected (left out when it is the first)
//   name, name_2 ...   a scenario's name, when it is not the default
// and any "shared" boxes, which belong to the comparison rather than to one scenario (like how many years to compare).

export const MAX_SCENARIOS = 5;

export type Fields = Record<string, string>;

export type ScenarioState<T extends Fields> = {
  list: T[];
  names: string[];
  /** The scenario being edited, counting from 0. */
  active: number;
};

const LETTERS = 'ABCDE';
/** "Deal A", "Plan B" ...: what scenario number `index` (from 0) is called until it is renamed. */
export const defaultName = (label: string, index: number): string => `${label} ${LETTERS[index] ?? index + 1}`;

const suffix = (i: number) => (i === 0 ? '' : `_${i + 1}`);
const MAX_VALUE = 60;
const MAX_NAME = 24;

export function initialState<T extends Fields>(defaults: T, label: string): ScenarioState<T> {
  return { list: [{ ...defaults }], names: [defaultName(label, 0)], active: 0 };
}

/** The address's query string -> scenarios and shared boxes. Anything missing, too long or odd keeps its default. */
export function readScenarios<T extends Fields, S extends Fields>(search: string, defaults: T, shared: S, label: string): { state: ScenarioState<T>; shared: S } {
  const params = new URLSearchParams(search);
  const count = Math.min(MAX_SCENARIOS, Math.max(1, parseInt(params.get('n') ?? '', 10) || 1));
  const list: T[] = [];
  const names: string[] = [];
  for (let i = 0; i < count; i++) {
    const values: Record<string, string> = { ...defaults };
    for (const key of Object.keys(defaults)) {
      const v = params.get(`${key}${suffix(i)}`);
      if (v !== null && v.length <= MAX_VALUE) values[key] = v;
    }
    list.push(values as T);
    const name = params.get(`name${suffix(i)}`)?.trim().slice(0, MAX_NAME);
    names.push(name || defaultName(label, i));
  }
  const active = Math.min(count - 1, Math.max(0, (parseInt(params.get('a') ?? '', 10) || 1) - 1));
  const sharedValues: Record<string, string> = { ...shared };
  for (const key of Object.keys(shared)) {
    const v = params.get(key);
    if (v !== null && v.length <= MAX_VALUE) sharedValues[key] = v;
  }
  return { state: { list, names, active }, shared: sharedValues as S };
}

/** Scenarios and shared boxes -> a query string (no leading ?), holding only what differs from the defaults. */
export function writeScenarios<T extends Fields, S extends Fields>(state: ScenarioState<T>, defaults: T, shared: S, sharedDefaults: S, label: string): string {
  const q = new URLSearchParams();
  if (state.list.length > 1) q.set('n', String(state.list.length));
  if (state.active > 0) q.set('a', String(state.active + 1));
  state.list.forEach((values, i) => {
    for (const key of Object.keys(defaults)) if (values[key] !== defaults[key]) q.set(`${key}${suffix(i)}`, values[key]);
    if (state.names[i] !== defaultName(label, i)) q.set(`name${suffix(i)}`, state.names[i]);
  });
  for (const key of Object.keys(sharedDefaults)) if (shared[key] !== sharedDefaults[key]) q.set(key, shared[key]);
  return q.toString();
}

// ---- changing the list ----

/** A new scenario, copied from the selected one and selected itself. Nothing happens at the limit. */
export function addScenario<T extends Fields>(s: ScenarioState<T>, label: string): ScenarioState<T> {
  if (s.list.length >= MAX_SCENARIOS) return s;
  const index = s.list.length;
  return { list: [...s.list, { ...s.list[s.active] }], names: [...s.names, defaultName(label, index)], active: index };
}

/** Removes one, keeping at least one. The selection stays on the same scenario where it can. */
export function removeScenario<T extends Fields>(s: ScenarioState<T>, index: number): ScenarioState<T> {
  if (s.list.length <= 1 || index < 0 || index >= s.list.length) return s;
  const active = s.active > index ? s.active - 1 : Math.min(s.active, s.list.length - 2);
  return { list: s.list.filter((_, i) => i !== index), names: s.names.filter((_, i) => i !== index), active };
}

export function setField<T extends Fields>(s: ScenarioState<T>, key: keyof T & string, value: string): ScenarioState<T> {
  return { ...s, list: s.list.map((v, i) => (i === s.active ? { ...v, [key]: value } : v)) };
}

export function renameScenario<T extends Fields>(s: ScenarioState<T>, index: number, name: string): ScenarioState<T> {
  return { ...s, names: s.names.map((n, i) => (i === index ? name.slice(0, MAX_NAME) : n)) };
}
