import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { THEME_KEY, THEME_SCRIPT, THEME_PREFS, parseThemePref, resolveTheme } from '../../src/lib/theme.ts';

describe('parseThemePref', () => {
  test('keeps the two explicit choices', () => {
    assert.equal(parseThemePref('light'), 'light');
    assert.equal(parseThemePref('dark'), 'dark');
  });

  test('anything else is auto: nothing saved, "auto" itself, old or tampered values', () => {
    for (const v of [null, undefined, '', 'auto', 'DARK', 'sepia', 1, {}]) {
      assert.equal(parseThemePref(v), 'auto');
    }
  });
});

describe('resolveTheme', () => {
  test('an explicit choice ignores the device', () => {
    assert.equal(resolveTheme('light', true), 'light');
    assert.equal(resolveTheme('dark', false), 'dark');
  });

  test('auto follows the device', () => {
    assert.equal(resolveTheme('auto', true), 'dark');
    assert.equal(resolveTheme('auto', false), 'light');
  });
});

test('the toggle offers all three, light first', () => {
  assert.deepEqual([...THEME_PREFS], ['light', 'auto', 'dark']);
});

// The head script is a string inlined into the page, so nothing type-checks it. Run it for real
// against a stand-in for the bits of the browser it touches.
describe('THEME_SCRIPT (runs before first paint)', () => {
  function run({ saved, systemDark = false, storageThrows = false, noMatchMedia = false }) {
    const attrs = {};
    const classes = new Set();
    const documentElement = {
      setAttribute: (k, v) => (attrs[k] = v),
      classList: { add: (c) => classes.add(c), remove: (c) => classes.delete(c) },
    };
    const localStorage = {
      getItem: (k) => {
        if (storageThrows) throw new Error('blocked');
        assert.equal(k, THEME_KEY);
        return saved ?? null;
      },
    };
    const window = noMatchMedia ? {} : { matchMedia: () => ({ matches: systemDark }) };
    const sandbox = { document: { documentElement }, localStorage, window, ...(noMatchMedia ? {} : { matchMedia: window.matchMedia }) };
    vm.runInNewContext(THEME_SCRIPT, sandbox);
    return { pref: attrs['data-theme-pref'], theme: attrs['data-theme'], dark: classes.has('dark') };
  }

  test('saved dark wins over a light device', () => {
    assert.deepEqual(run({ saved: 'dark', systemDark: false }), { pref: 'dark', theme: 'dark', dark: true });
  });

  test('saved light wins over a dark device', () => {
    assert.deepEqual(run({ saved: 'light', systemDark: true }), { pref: 'light', theme: 'light', dark: false });
  });

  test('nothing saved follows the device, both ways', () => {
    assert.deepEqual(run({ systemDark: true }), { pref: 'auto', theme: 'dark', dark: true });
    assert.deepEqual(run({ systemDark: false }), { pref: 'auto', theme: 'light', dark: false });
  });

  test('a junk saved value is treated as auto', () => {
    assert.deepEqual(run({ saved: 'purple', systemDark: true }), { pref: 'auto', theme: 'dark', dark: true });
  });

  test('blocked storage does not throw and falls back to the device', () => {
    assert.deepEqual(run({ storageThrows: true, systemDark: true }), { pref: 'auto', theme: 'dark', dark: true });
  });

  test('a browser with no matchMedia falls back to light', () => {
    assert.deepEqual(run({ noMatchMedia: true }), { pref: 'auto', theme: 'light', dark: false });
  });
});
