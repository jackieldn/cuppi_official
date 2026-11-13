import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { resolveFan, applyFan, fanShownCount, FAN_MAX } from '../../src/lib/fan-settings.ts';

const feats = (n) => Array.from({ length: n }, (_, i) => ({ slug: `f${i + 1}` }));
const slugs = (entries) => entries.map((e) => e.slug);
const shown = (entries) => entries.filter((e) => e.visible).map((e) => e.slug);

describe('resolveFan', () => {
  test('nothing stored gives the first eight, in feature order (as before it was editable)', () => {
    for (const bad of [undefined, null, 'rubbish', 5, {}, { icons: 'no' }]) {
      const r = resolveFan(bad, feats(10));
      assert.deepEqual(slugs(r), feats(10).map((f) => f.slug));
      assert.deepEqual(shown(r), feats(8).map((f) => f.slug), String(bad));
    }
  });

  test('keeps the stored order and switches', () => {
    const r = resolveFan({ icons: [{ slug: 'f3', visible: true }, { slug: 'f1', visible: false }, { slug: 'f2', visible: true }] }, feats(3));
    assert.deepEqual(slugs(r), ['f3', 'f1', 'f2']);
    assert.deepEqual(shown(r), ['f3', 'f2']);
  });

  test('drops features that no longer exist, repeats, and junk', () => {
    const r = resolveFan({ icons: [{ slug: 'gone', visible: true }, { slug: 'f1', visible: true }, { slug: 'f1', visible: false }, null, 7, { visible: true }, { slug: 5 }] }, feats(2));
    assert.deepEqual(slugs(r), ['f1', 'f2']);
    assert.deepEqual(shown(r), ['f1']);
  });

  test('a feature added after the last save waits at the end, switched off', () => {
    const r = resolveFan({ icons: [{ slug: 'f2', visible: true }, { slug: 'f1', visible: true }] }, feats(3));
    assert.deepEqual(r.at(-1), { slug: 'f3', visible: false });
    assert.deepEqual(shown(r), ['f2', 'f1']);
  });

  test('only "visible: true" switches an icon on', () => {
    const r = resolveFan({ icons: [{ slug: 'f1', visible: 'yes' }, { slug: 'f2', visible: 1 }] }, feats(2));
    assert.deepEqual(shown(r), []);
  });

  test('never shows more than the layout has room for', () => {
    const icons = feats(12).map((f) => ({ slug: f.slug, visible: true }));
    const r = resolveFan({ icons }, feats(12));
    assert.equal(fanShownCount(r), FAN_MAX);
    assert.deepEqual(shown(r), feats(FAN_MAX).map((f) => f.slug), 'the first ones stay on');
    assert.equal(r.length, 12, 'the rest are still listed, off');
  });

  test('nothing to choose from is fine', () => assert.deepEqual(resolveFan({ icons: [{ slug: 'x', visible: true }] }, []), []));
});

describe('applyFan', () => {
  test('returns the features themselves, switched on, in banner order', () => {
    const features = [{ slug: 'a', name: 'A' }, { slug: 'b', name: 'B' }, { slug: 'c', name: 'C' }];
    const out = applyFan(features, { icons: [{ slug: 'c', visible: true }, { slug: 'a', visible: false }, { slug: 'b', visible: true }] });
    assert.deepEqual(out, [features[2], features[1]]);
  });
  test('a bad document gives the default banner', () => assert.equal(applyFan(feats(10), 'x').length, 8));
});
