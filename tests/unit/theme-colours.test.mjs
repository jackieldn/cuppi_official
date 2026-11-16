import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  COLOURS, COLOUR_KEYS, PAIRINGS, browserChrome, buildColourCss, channelsToHex, checkPairings, colourValues, contrast, countChanges, declarations,
  defaultColours, defaultHex, emptyColourSettings, hexToChannels, hexToHsl, normaliseHex, previewVariables, resolveColours,
} from '../../src/lib/theme-colours.ts';

const css = readFileSync(new URL('../../src/app/globals.css', import.meta.url), 'utf8');

/** The `--c-*` channels declared in the CSS rule that starts with this selector. */
function channelsIn(selector) {
  const start = css.indexOf(selector + ' {');
  assert.ok(start >= 0, `globals.css has ${selector}`);
  const body = css.slice(start, css.indexOf('\n  }', start));
  const out = {};
  for (const m of body.matchAll(/--c-([a-z-]+):\s*(\d+ \d+ \d+);/g)) out[m[1]] = m[2];
  return out;
}

describe('the defaults match globals.css', () => {
  const light = channelsIn('.theme-cuppi');
  const darkOverrides = channelsIn("html[data-theme='dark'] .theme-cuppi");

  test('every colour in the list is in the CSS, and every CSS colour is in the list', () => {
    assert.deepEqual([...COLOUR_KEYS].sort(), Object.keys(light).sort());
  });

  test('light defaults are the CSS values', () => {
    for (const d of COLOURS) assert.equal(d.light, light[d.key], `light ${d.key}`);
  });

  test('dark defaults are the light value unless the dark block changes it', () => {
    for (const d of COLOURS) assert.equal(d.dark, darkOverrides[d.key] ?? light[d.key], `dark ${d.key}`);
  });

  test('the address-bar colours in theme.ts are the paper colours', async () => {
    const { THEME_COLOURS } = await import('../../src/lib/theme.ts');
    assert.equal(THEME_COLOURS.light.toLowerCase(), defaultHex('paper', 'light'));
    assert.equal(THEME_COLOURS.dark.toLowerCase(), defaultHex('paper', 'dark'));
  });
});

describe('colour arithmetic', () => {
  test('normaliseHex accepts #rrggbb and #rgb, any case, and nothing else', () => {
    assert.equal(normaliseHex('#FBF4E6'), '#fbf4e6');
    assert.equal(normaliseHex(' #abc '), '#aabbcc');
    for (const bad of ['fbf4e6', '#fbf4e', '#fbf4e6ff', 'red', 'rgb(1,2,3)', '#12345g', '', null, 5, '#fff;}body{display:none']) assert.equal(normaliseHex(bad), null);
  });

  test('hex and channels convert both ways', () => {
    assert.equal(hexToChannels('#fbf4e6'), '251 244 230');
    assert.equal(channelsToHex('251 244 230'), '#fbf4e6');
    assert.equal(channelsToHex('0 0 0'), '#000000');
  });

  test('hexToHsl gives the H S% L% the shadcn variables use', () => {
    assert.equal(hexToHsl('#ffffff'), '0 0% 100%');
    assert.equal(hexToHsl('#000000'), '0 0% 0%');
    assert.equal(hexToHsl('#ff0000'), '0 100% 50%');
    assert.equal(hexToHsl('#00ff00'), '120 100% 50%');
    assert.equal(hexToHsl('#0000ff'), '240 100% 50%');
    // Cuppi's paper is hsl(40 72% 94%) in globals.css.
    assert.equal(hexToHsl('#fbf4e6'), '40 72.4% 94.3%');
  });

  test('contrast: black on white is 21, a colour on itself is 1, and order does not matter', () => {
    assert.ok(Math.abs(contrast('#000000', '#ffffff') - 21) < 0.001);
    assert.equal(contrast('#fbf4e6', '#fbf4e6'), 1);
    assert.equal(contrast('#2b2118', '#fbf4e6'), contrast('#fbf4e6', '#2b2118'));
  });
});

describe('resolveColours', () => {
  test('nothing stored, or rubbish, gives a switched-off, empty set', () => {
    for (const stored of [undefined, null, 'x', 5, [], {}]) assert.deepEqual(resolveColours(stored), emptyColourSettings());
  });

  test('keeps known colours written as hex, normalised', () => {
    const r = resolveColours({ enabled: true, light: { paper: '#FFFFFF', ink: '#123' }, dark: { card: '#000000' } });
    assert.deepEqual(r, { enabled: true, light: { paper: '#ffffff', ink: '#112233' }, dark: { card: '#000000' } });
  });

  test('drops unknown colours, bad values, and values equal to the default', () => {
    const r = resolveColours({ light: { nope: '#ffffff', paper: 'cream', ink: '#2b2118', card: '#fff;}x{' }, dark: { paper: '#241812' } });
    assert.deepEqual(r.light, {});
    assert.deepEqual(r.dark, {});
  });

  test('"enabled" must be exactly true', () => {
    for (const enabled of [1, 'true', null, undefined]) assert.equal(resolveColours({ enabled }).enabled, false);
    assert.equal(resolveColours({ enabled: true }).enabled, true);
  });

  test('defaults are per theme: a value is only a change in the theme where it differs', () => {
    // #34241a is the dark card but a change in light.
    const r = resolveColours({ light: { card: '#34241a' }, dark: { card: '#34241a' } });
    assert.deepEqual(r.light, { card: '#34241a' });
    assert.deepEqual(r.dark, {});
  });

  test('countChanges and colourValues', () => {
    const r = resolveColours({ light: { paper: '#ffffff' }, dark: { paper: '#000000', card: '#111111' } });
    assert.equal(countChanges(r), 3);
    assert.equal(colourValues(r.light, 'light').paper, '#ffffff');
    assert.equal(colourValues(r.light, 'light').card, defaultHex('card', 'light'));
  });
});

describe('the stylesheet', () => {
  test('switched off, or with nothing changed, there is no stylesheet', () => {
    assert.equal(buildColourCss(emptyColourSettings()), '');
    assert.equal(buildColourCss({ enabled: true, light: {}, dark: {} }), '');
    assert.equal(buildColourCss({ enabled: false, light: { paper: '#ffffff' }, dark: {} }), '');
  });

  test('a change to a colour that dark redefines is a light rule only; a dark change is a dark rule only', () => {
    const light = buildColourCss({ enabled: true, light: { paper: '#ffffff' }, dark: {} });
    assert.equal(light, 'html .theme-cuppi{--c-paper:255 255 255;--background:0 0% 100%}');
    const dark = buildColourCss({ enabled: true, light: {}, dark: { honey: '#ff0000' } });
    assert.equal(dark, "html[data-theme='dark'] .theme-cuppi{--c-honey:255 0 0;--accent:0 100% 50%}");
  });

  test('a light change to a colour that dark only inherits is pinned back in the dark rule, so it cannot leak', () => {
    // globals.css leaves honey alone in dark, so without the pin a light honey would show in dark too.
    assert.equal(
      buildColourCss({ enabled: true, light: { honey: '#ff0000' }, dark: {} }),
      "html .theme-cuppi{--c-honey:255 0 0;--accent:0 100% 50%}\nhtml[data-theme='dark'] .theme-cuppi{--c-honey:242 165 59}",
    );
    // With a dark change of its own, that wins and there is nothing to pin.
    assert.equal(
      buildColourCss({ enabled: true, light: { honey: '#ff0000' }, dark: { honey: '#00ff00' } }),
      "html .theme-cuppi{--c-honey:255 0 0;--accent:0 100% 50%}\nhtml[data-theme='dark'] .theme-cuppi{--c-honey:0 255 0;--accent:120 100% 50%}",
    );
    // A colour dark redefines in globals.css needs no pin: the dark default already outranks the light change.
    assert.ok(!buildColourCss({ enabled: true, light: { paper: '#ffffff' }, dark: {} }).includes('data-theme'));
  });

  test('both themes together give two rules, dark second', () => {
    const out = buildColourCss({ enabled: true, light: { lake: '#000000' }, dark: { lake: '#111111' } }).split('\n');
    assert.equal(out.length, 2);
    assert.ok(out[0].startsWith('html .theme-cuppi{'));
    assert.ok(out[1].startsWith("html[data-theme='dark'] .theme-cuppi{"));
  });

  test('a colour with no shadcn follower sets only its own variable', () => {
    assert.equal(declarations({ lake: '#000000' }), '--c-lake:0 0 0');
  });

  test('only #rrggbb ever reaches the CSS, even if the settings object is not from resolveColours', () => {
    assert.equal(declarations({ paper: 'red;}body{display:none', ink: '#12345' }), '');
    const css = buildColourCss({ enabled: true, light: { paper: '</style><script>', ink: '#000000' }, dark: {} });
    assert.ok(!css.includes('<'));
  });

  test('browserChrome uses the changed page colour only when the colours are on', () => {
    assert.deepEqual(browserChrome(emptyColourSettings()), { light: '#fbf4e6', dark: '#241812' });
    assert.deepEqual(browserChrome({ enabled: true, light: { paper: '#ffffff' }, dark: {} }), { light: '#ffffff', dark: '#241812' });
    assert.deepEqual(browserChrome({ enabled: false, light: { paper: '#ffffff' }, dark: {} }), { light: '#fbf4e6', dark: '#241812' });
  });

  test('previewVariables gives a whole theme, with changes applied', () => {
    const v = previewVariables({ paper: '#ffffff' }, 'dark');
    assert.equal(v['--c-paper'], '255 255 255');
    assert.equal(v['--background'], '0 0% 100%');
    assert.equal(v['--c-card'], defaultColours('dark').card && hexToChannels(defaultHex('card', 'dark')));
    assert.equal(Object.keys(v).filter((k) => k.startsWith('--c-')).length, COLOUR_KEYS.length);
  });
});

describe('readability checks', () => {
  test('every pairing names real colours', () => {
    for (const p of PAIRINGS) assert.ok(COLOUR_KEYS.includes(p.text) && COLOUR_KEYS.includes(p.on), p.label);
  });

  test('the designed palette passes every check in both themes (as docs/cuppi-brand.md promises)', () => {
    for (const mode of ['light', 'dark']) for (const r of checkPairings({}, mode)) assert.ok(r.ok, `${mode}: ${r.label} is ${r.ratio.toFixed(2)}`);
  });

  test('changing a colour changes the result', () => {
    const bad = checkPairings({ ink: '#fbf4e5' }, 'light').find((r) => r.label === 'Main text on the page');
    assert.equal(bad.ok, false);
  });
});
