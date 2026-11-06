import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dominantColour } from '../../src/lib/icon-colour.ts';

/** RGBA data from a list of [r, g, b, a, count] runs. */
const pixels = (...runs) => {
  const out = [];
  for (const [r, g, b, a, count] of runs) for (let i = 0; i < count; i++) out.push(r, g, b, a);
  return Uint8ClampedArray.from(out);
};

test('a flat colour comes back as itself', () => {
  assert.equal(dominantColour(pixels([30, 160, 140, 255, 100])), '#1ea08c');
});

test('the brand colour beats a larger area of white', () => {
  // 70% white glyph/background, 30% teal
  assert.equal(dominantColour(pixels([255, 255, 255, 255, 70], [30, 160, 140, 255, 30])), '#1ea08c');
});

test('the brand colour beats a larger area of black', () => {
  assert.equal(dominantColour(pixels([0, 0, 0, 255, 80], [220, 60, 40, 255, 20])), '#dc3c28');
});

test('transparent pixels are ignored', () => {
  assert.equal(dominantColour(pixels([255, 0, 0, 0, 500], [40, 90, 200, 255, 10])), '#285ac8');
});

test('a plain white or black icon still resolves', () => {
  assert.equal(dominantColour(pixels([255, 255, 255, 255, 50])), '#ffffff');
  assert.equal(dominantColour(pixels([0, 0, 0, 255, 50])), '#000000');
});

test('nothing visible means no colour', () => {
  assert.equal(dominantColour(pixels([10, 20, 30, 0, 50])), null);
  assert.equal(dominantColour(new Uint8ClampedArray(0)), null);
});

test('a gradient resolves to a colour from within it', () => {
  const run = [];
  for (let i = 0; i < 100; i++) run.push([20 + i, 150, 160 - i, 255, 1]);
  const colour = dominantColour(pixels(...run));
  assert.match(colour, /^#[0-9a-f]{6}$/);
  const [r] = [parseInt(colour.slice(1, 3), 16)];
  assert.ok(r >= 20 && r <= 120);
});
