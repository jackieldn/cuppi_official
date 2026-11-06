import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeApp,
  sortApps,
  linkAction,
  orderGroup,
  aspectOf,
  hostOf,
  sectionImages,
} from '../../src/lib/showcase.ts';

const img = (n, w = 1170, h = 2532) => ({ url: `https://example.com/${n}.png`, width: w, height: h });

test('an entry saved by the old admin is mapped onto the new shape', () => {
  const app = normalizeApp({
    id: 'a1',
    title: 'Cuppi',
    slug: 'cuppi',
    description: 'Plan <b>meals</b> together.',
    platforms: ['iOS', 'Android'],
    availability: 'Beta',
    releaseDate: '2025-03-01',
    link: 'https://testflight.apple.com/join/abc',
    coverImage: img('cover'),
    galleryImages: [img('one'), img('two')],
    updateHistory: [{ id: 'u', date: '2025-04-01', version: '1.1', description: 'x' }],
  });
  assert.equal(app.kind, 'app');
  assert.equal(app.status, 'testflight');
  assert.equal(app.tagline, 'Plan meals together.');
  assert.equal(app.sections.length, 1);
  assert.equal(app.sections[0].type, 'gallery');
  assert.equal(app.sections[0].images.length, 2);
  assert.equal(app.icon, null);
});

test('the icon colour is kept when valid and dropped when not', () => {
  assert.equal(normalizeApp({ id: 'c', iconColor: '#1EA08C' }).iconColor, '#1ea08c');
  assert.equal(normalizeApp({ id: 'c', iconColor: 'teal' }).iconColor, '');
  assert.equal(normalizeApp({ id: 'c', iconColor: '#12345' }).iconColor, '');
  assert.equal(normalizeApp({ id: 'c' }).iconColor, '');
});

test('an old cover screenshot is carried along only so it can be cleaned up', () => {
  const app = normalizeApp({ id: 'k', coverImage: img('cover'), icon: img('icon', 512, 512) });
  assert.equal(app.coverImage.url, 'https://example.com/cover.png');
  assert.equal(app.icon.url, 'https://example.com/icon.png');
  assert.equal(normalizeApp({ id: 'k' }).coverImage, null);
});

test('legacy availability values map to a status', () => {
  const status = (availability) => normalizeApp({ id: 'x', availability }).status;
  assert.equal(status('Available'), 'live');
  assert.equal(status('Beta'), 'testflight');
  assert.equal(status('In Development'), 'testflight');
  assert.equal(status('Retired'), 'decommissioned');
  assert.equal(status(undefined), 'live');
});

test('a web-only legacy entry becomes a website, and drops the Web platform', () => {
  const site = normalizeApp({ id: 'w', platforms: ['Web'], availability: 'Available' });
  assert.equal(site.kind, 'website');
  assert.deepEqual(site.platforms, []);
});

test('a website can never be TestFlight', () => {
  assert.equal(normalizeApp({ id: 'w', kind: 'website', status: 'testflight' }).status, 'live');
});

test('new-format sections are kept, junk is dropped, missing arrays are tolerated', () => {
  const app = normalizeApp({
    id: 'n',
    kind: 'app',
    status: 'live',
    sections: [
      { id: 's1', type: 'feature', title: 'Hi', body: 'Body', textSide: 'right', image: img('f') },
      { id: 's2', type: 'gallery', title: '', images: [img('a'), { nope: true }, img('b')] },
      { id: 's3', type: 'carousel' },
      null,
    ],
  });
  assert.deepEqual(app.sections.map((s) => s.type), ['feature', 'gallery']);
  assert.equal(app.sections[0].textSide, 'right');
  assert.equal(app.sections[1].images.length, 2);
  assert.equal(sectionImages(app.sections).length, 3);
  assert.deepEqual(normalizeApp({ id: 'e', sections: [] }).sections, []);
});

test('the card line falls back to the description, clipped', () => {
  const long = 'word '.repeat(60);
  const app = normalizeApp({ id: 't', description: long });
  assert.ok(app.tagline.length <= 140);
  assert.ok(app.tagline.endsWith('…'));
  assert.equal(normalizeApp({ id: 't', tagline: 'Short', description: long }).tagline, 'Short');
});

test('live comes before TestFlight before decommissioned; then order; then newest', () => {
  const mk = (id, status, order, releaseDate) => normalizeApp({ id, title: id, kind: 'app', status, order, releaseDate });
  const sorted = sortApps([
    mk('old-ended', 'decommissioned', 0, '2020-01-01'),
    mk('tf', 'testflight', 0, '2026-01-01'),
    mk('live-b', 'live', 2, '2024-01-01'),
    mk('live-a', 'live', 1, '2022-01-01'),
    mk('live-new', 'live', undefined, '2026-01-01'),
    mk('live-old', 'live', undefined, '2021-01-01'),
  ]).map((a) => a.id);
  assert.deepEqual(sorted, ['live-a', 'live-b', 'live-new', 'live-old', 'tf', 'old-ended']);
});

test('the call to action depends on kind and status', () => {
  const store = 'https://apps.apple.com/gb/app/cuppi/id1';
  assert.deepEqual(linkAction({ kind: 'app', status: 'live', link: store }), { label: 'View on the App Store', href: store });
  assert.equal(linkAction({ kind: 'app', status: 'testflight', link: 'https://testflight.apple.com/join/x' }).label, 'Join the TestFlight');
  assert.equal(linkAction({ kind: 'website', status: 'live', link: 'https://example.com' }).label, 'Visit website');
  assert.equal(linkAction({ kind: 'website', status: 'decommissioned', link: 'https://example.com' }), null);
  assert.equal(linkAction({ kind: 'app', status: 'live', link: '' }), null);
});

test('reorder groups are per kind and status', () => {
  assert.equal(orderGroup({ kind: 'app', status: 'live' }), orderGroup({ kind: 'app', status: 'live' }));
  assert.notEqual(orderGroup({ kind: 'app', status: 'live' }), orderGroup({ kind: 'app', status: 'testflight' }));
  assert.notEqual(orderGroup({ kind: 'app', status: 'live' }), orderGroup({ kind: 'app', status: 'decommissioned' }));
  assert.notEqual(orderGroup({ kind: 'app', status: 'live' }), orderGroup({ kind: 'website', status: 'live' }));
});

test('small helpers', () => {
  assert.equal(aspectOf({ width: 200, height: 100 }), 2);
  assert.equal(aspectOf({ width: 0, height: 0 }), 1);
  assert.equal(aspectOf(null), 1);
  assert.equal(hostOf('https://www.example.com/path'), 'example.com');
  assert.equal(hostOf('nonsense'), '');
});
