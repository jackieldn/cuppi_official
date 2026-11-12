import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { validateFeatures, GROUP_ORDER } from '../../src/lib/features-types.ts';

const image = { url: 'https://example.com/a.webp', alt: 'A phone' };
const feature = (slug, extra = {}) => ({
  slug,
  name: slug,
  tagline: 'A tagline',
  icon: 'home',
  tint: 'honey',
  group: 'family',
  status: 'live',
  order: 1,
  hero: { headline: 'A headline', intro: 'An intro', image },
  blocks: [],
  ...extra,
});

describe('validateFeatures', () => {
  test('accepts a well-formed feature', () => {
    const f = feature('bin-day', {
      blocks: [
        { id: 'a', type: 'callout', title: 'Hello', tint: 'moss' },
        { id: 'b', type: 'cards', title: 'Cards', cards: [{ title: 't', body: 'b', image }] },
      ],
    });
    assert.deepEqual(validateFeatures([f]), []);
  });

  test('catches a duplicate slug', () => {
    const problems = validateFeatures([feature('pets'), feature('pets')]);
    assert.equal(problems.length, 1);
    assert.match(problems[0], /used twice/);
  });

  test('catches a slug that would make a bad URL', () => {
    assert.match(validateFeatures([feature('Bin Day')])[0], /lowercase words joined by hyphens/);
    assert.match(validateFeatures([feature('bin_day')])[0], /lowercase words joined by hyphens/);
  });

  test('catches an unknown group', () => {
    assert.match(validateFeatures([feature('pets', { group: 'nonsense' })])[0], /unknown group/);
  });

  test('a feature that is coming soon needs no hero', () => {
    assert.deepEqual(validateFeatures([feature('chores', { status: 'soon', hero: undefined, blocks: undefined })]), []);
  });

  test('catches a hero with no headline or image', () => {
    const f = feature('pets', { hero: { headline: '  ', intro: '', image: { url: '', alt: '' } } });
    const problems = validateFeatures([f]);
    assert.equal(problems.length, 2);
  });

  test('catches duplicate block ids and empty blocks', () => {
    const f = feature('pets', {
      blocks: [
        { id: 'x', type: 'callout', title: 'a', tint: 'sky' },
        { id: 'x', type: 'cards', title: 'b', cards: [] },
        { id: 'y', type: 'points', items: [] },
        { id: 'z', type: 'showcase', title: 't', body: 'b', side: 'left', tint: 'sky', image: { url: '', alt: '' } },
      ],
    });
    const problems = validateFeatures([f]);
    assert.equal(problems.length, 4);
  });

  test('every group in the menu order has a label slot', () => {
    assert.deepEqual([...GROUP_ORDER].sort(), ['family', 'home', 'yours']);
  });
});
