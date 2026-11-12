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
    assert.deepEqual([...GROUP_ORDER].sort(), ['family', 'finance', 'home', 'yours']);
  });
});

import { mergeFeatures, readOverride, inMenu, isPublished, slugify, hasPage } from '../../src/lib/features-types.ts';

const STORAGE = 'https://firebasestorage.googleapis.com/v0/b/studio-5700093446-89b93.firebasestorage.app/';

describe('admin edits to features', () => {
  const seedOf = (slug, extra = {}) => feature(slug, { order: 10, tile: 'blue', ...extra });

  test('an override changes only the fields it has', () => {
    const [m] = mergeFeatures([seedOf('pets', { name: 'Pets' })], [{ slug: 'pets', name: 'Furry friends' }]);
    assert.equal(m.name, 'Furry friends');
    assert.equal(m.tagline, 'A tagline');
    assert.equal(m.group, 'family');
  });

  test('a feature the seed lacks is added, with defaults, once it has a name', () => {
    const out = mergeFeatures([seedOf('pets')], [{ slug: 'garden', name: 'Garden', tile: 'green' }, { slug: 'nameless' }]);
    const g = out.find((f) => f.slug === 'garden');
    assert.ok(g);
    assert.equal(g.tint, 'moss'); // from the green tile
    assert.equal(g.status, 'live');
    assert.equal(g.group, 'home');
    assert.ok(!out.some((f) => f.slug === 'nameless'));
  });

  test('a new feature has a page only when it has a hero', () => {
    const [soon] = mergeFeatures([], [{ slug: 'garden', name: 'Garden' }]);
    assert.equal(hasPage(soon), false);
    const [live] = mergeFeatures([], [{ slug: 'garden', name: 'Garden', hero: { headline: 'H', intro: 'I', image } }]);
    assert.equal(hasPage(live), true);
    assert.deepEqual(live.blocks, []);
  });

  test('giving a "soon" seed feature a hero makes it a page (it still needs status live)', () => {
    const seed = [{ slug: 'car', name: 'Car', tagline: '', icon: 'sparkles', tint: 'sky', tile: 'blue', group: 'home', status: 'soon', order: 5 }];
    const [car] = mergeFeatures(seed, [{ slug: 'car', status: 'live', hero: { headline: 'H', intro: 'I', image } }]);
    assert.equal(hasPage(car), true);
  });

  test('results are in menu order', () => {
    const out = mergeFeatures([seedOf('b', { order: 20 }), seedOf('a', { order: 10 })], [{ slug: 'c', name: 'C', order: 15 }]);
    assert.deepEqual(out.map((f) => f.slug), ['a', 'c', 'b']);
  });

  test('published and showInMenu: both default to on', () => {
    assert.equal(isPublished(feature('a')), true);
    assert.equal(inMenu(feature('a')), true);
    assert.equal(inMenu(feature('a', { showInMenu: false })), false);
    assert.equal(isPublished(feature('a', { showInMenu: false })), true);
    assert.equal(inMenu(feature('a', { published: false })), false);
  });

  test('readOverride keeps good fields and drops bad ones', () => {
    const o = readOverride('x', {
      name: ' Garden ',
      group: 'nonsense',
      tile: 'green',
      order: 'high',
      published: 'yes',
      showInMenu: false,
      iconUrl: 'javascript:alert(1)',
      hero: { headline: 'H', intro: 'I', image: { url: STORAGE + 'o/cuppi_features%2Fa.png?alt=media', alt: 'a' } },
    });
    assert.equal(o.name, 'Garden');
    assert.equal(o.group, undefined);
    assert.equal(o.tile, 'green');
    assert.equal(o.order, undefined);
    assert.equal(o.published, undefined);
    assert.equal(o.showInMenu, false);
    assert.equal(o.iconUrl, undefined);
    assert.equal(o.hero.headline, 'H');
    assert.equal(readOverride('x', null), null);
    assert.equal(readOverride('x', { hero: { headline: 'H', image: { url: 'http://insecure' } } }).hero, undefined);
    // next/image only accepts this site's own files and its own storage bucket
    assert.equal(readOverride('x', { iconUrl: 'https://example.com/a.png' }).iconUrl, undefined);
    assert.equal(readOverride('x', { iconUrl: '/icons/a.png' }).iconUrl, '/icons/a.png');
  });

  test('slugify', () => {
    assert.equal(slugify('Bin Day!'), 'bin-day');
    assert.equal(slugify('  Café & Cake  '), 'cafe-cake');
    assert.equal(slugify('***'), '');
  });
});
