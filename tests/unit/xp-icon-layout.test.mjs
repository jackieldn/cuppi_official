import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { ICON_H, ICON_W, clampPoint, createLayout } from '../../src/components/desktop/xp/xp-icon-layout.ts';

const GROUPS = ['system', 'media', 'docs', 'pics'];
const ICONS = [
  ['computer', 'system'], ['documents', 'system'], ['browser', 'system'],
  ['amp', 'media'], ['torrent', 'media'], ['avi-1', 'media'], ['avi-2', 'media'],
  ['doc-1', 'docs'], ['doc-2', 'docs'], ['doc-3', 'docs'], ['asdfgh', 'docs'],
  ['pic-1', 'pics'], ['pic-2', 'pics'], ['pic-3', 'pics'],
].map(([id, group]) => ({ id, group }));
const ENV = { width: 1440, height: 860, covered: [104, 1284], groups: GROUPS };

const layoutFor = (seed, env = ENV) => {
  const layout = createLayout({ ...env, seed });
  return { layout, points: Object.fromEntries(ICONS.map((i) => [i.id, layout.place(i)])) };
};

describe('createLayout', () => {
  test('puts every icon fully on the desktop', () => {
    for (let seed = 1; seed <= 40; seed++) {
      const { points } = layoutFor(seed);
      for (const [id, p] of Object.entries(points)) {
        assert.ok(p.x >= 0 && p.x + ICON_W <= ENV.width, `${id} x ${p.x} (seed ${seed})`);
        assert.ok(p.y >= 0 && p.y + ICON_H <= ENV.height, `${id} y ${p.y} (seed ${seed})`);
      }
    }
  });

  test('is the same for the same seed and different for another', () => {
    assert.deepEqual(layoutFor(7).points, layoutFor(7).points);
    assert.notDeepEqual(layoutFor(7).points, layoutFor(8).points);
  });

  test('an icon keeps its spot, and late arrivals do not move the others', () => {
    const early = createLayout({ ...ENV, seed: 3 });
    const before = ICONS.slice(0, 6).map((i) => early.place(i));
    const late = createLayout({ ...ENV, seed: 3 });
    for (const i of ICONS) late.place(i);
    assert.deepEqual(before, ICONS.slice(0, 6).map((i) => late.place(i)));
    assert.deepEqual(early.place(ICONS[0]), before[0]);
  });

  test('gathers two groups into corners that are not behind the window', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const { layout } = layoutFor(seed);
      const gathered = layout.clusters();
      assert.equal(gathered.length, 2);
      assert.equal(new Set(gathered.map((c) => `${c.left}${c.top}`)).size, 2, 'different corners');
    }
  });

  test('most of a gathered group is piled close together', () => {
    let close = 0;
    let total = 0;
    for (let seed = 1; seed <= 30; seed++) {
      const { layout, points } = layoutFor(seed);
      for (const { group, left, top } of layout.clusters()) {
        const members = ICONS.filter((i) => i.group === group).map((i) => points[i.id]);
        const cornerX = left ? 0 : ENV.width - ICON_W;
        const cornerY = top ? 0 : ENV.height - ICON_H;
        for (const p of members) {
          total += 1;
          if (Math.abs(p.x - cornerX) < 300 && Math.abs(p.y - cornerY) < 520) close += 1;
        }
      }
    }
    assert.ok(close / total > 0.6, `${close} of ${total} near their corner`);
  });

  test('loose icons stay out from under the window when there is room', () => {
    let under = 0;
    let total = 0;
    for (let seed = 1; seed <= 20; seed++) {
      const { layout, points } = layoutFor(seed);
      const gathered = new Set(layout.clusters().map((c) => c.group));
      for (const i of ICONS.filter((i) => !gathered.has(i.group))) {
        total += 1;
        const middle = points[i.id].x + ICON_W / 2;
        if (middle > ENV.covered[0] + 20 && middle < ENV.covered[1] - 20) under += 1;
      }
    }
    assert.ok(under / total < 0.1, `${under} of ${total} under the window`);
  });

  test('copes with a screen too small for everything', () => {
    const { points } = layoutFor(5, { width: 320, height: 240, covered: [20, 300], groups: GROUPS });
    for (const p of Object.values(points)) {
      assert.ok(p.x >= 0 && p.y >= 0 && Number.isFinite(p.x) && Number.isFinite(p.y));
    }
  });
});

describe('clampPoint', () => {
  test('keeps an icon on the desktop', () => {
    assert.deepEqual(clampPoint({ x: -50, y: 9999 }, 800, 500), { x: 0, y: 500 - ICON_H });
    assert.deepEqual(clampPoint({ x: 100.4, y: 50.6 }, 800, 500), { x: 100, y: 51 });
  });
});
