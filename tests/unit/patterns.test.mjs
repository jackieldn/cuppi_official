import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { patternLayers, PATTERNS, PATTERN_DEFAULTS } from '../../src/lib/patterns.ts';

const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, `${a} is not ${b}`);
const base = { shape: 'circle', focus: '72% 45%', centre: 0.05, edge: 0.3 };

describe('patternLayers', () => {
  test('the element takes the stronger of centre and edge, and the mask scales the other down', () => {
    const l = patternLayers(base);
    near(l.opacity, 0.3);
    near(l.opacity * l.centreAlpha, 0.05);
    near(l.opacity * l.edgeAlpha, 0.3);
  });

  test('works the other way round too (strong in the middle, quiet at the edge)', () => {
    const l = patternLayers({ ...base, centre: 0.3, edge: 0.05 });
    near(l.opacity, 0.3);
    near(l.opacity * l.centreAlpha, 0.3);
    near(l.opacity * l.edgeAlpha, 0.05);
  });

  test('with no cursor light, the mask is the fade alone', () => {
    const l = patternLayers(base);
    assert.equal(l.spotAlpha, 0);
    assert.equal((l.mask.match(/radial-gradient/g) ?? []).length, 1);
    assert.ok(!l.mask.includes('--spot'));
  });

  test('a cursor light of 50% lifts the element to 50% and adds a second mask layer', () => {
    const l = patternLayers({ ...base, spot: 0.5, radius: 190 });
    near(l.opacity, 0.5);
    near(l.opacity * l.spotAlpha, 0.5); // under the pointer the pattern is exactly 50%
    near(l.opacity * l.centreAlpha, 0.05); // away from it, the fade is untouched
    near(l.opacity * l.edgeAlpha, 0.3);
    assert.equal((l.mask.match(/radial-gradient/g) ?? []).length, 2);
    assert.match(l.mask, /circle 190px at var\(--mx, -999px\) var\(--my, -999px\)/);
    assert.match(l.mask, /var\(--spot, 0\)/);
  });

  test('a cursor light weaker than the pattern around it never dims anything', () => {
    const l = patternLayers({ ...base, spot: 0.1 });
    near(l.opacity, 0.3); // the element stays at the strongest layer
    near(l.opacity * l.spotAlpha, 0.1);
  });

  test('the light starts out of sight (far off-screen) until the pointer arrives', () => {
    assert.match(patternLayers({ ...base, spot: 0.5 }).mask, /-999px/);
  });

  test('the house defaults and the pattern paths are set', () => {
    assert.deepEqual(PATTERN_DEFAULTS, { size: 420, centre: 0.05, edge: 0.3 });
    for (const url of Object.values(PATTERNS)) assert.match(url, /^\/patterns\/[A-Za-z]+\.min\.svg$/);
  });
});
