import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { MOCKUPS, SCREEN_W, SCREEN_H, solveHomography, applyHomography, quadToMatrix3d, flipQuad, growQuad, OVERSCAN, SCREEN_RADIUS, phoneTops, contentEndFrac, screenSpan, fillsScreenByCover, screenFill } from '../../src/lib/phone-mockups.ts';

const close = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) < eps, `${a} is not within ${eps} of ${b}`);

describe('phone mockups', () => {
  for (const kind of ['front', 'tilt']) {
    test(`the ${kind} screenshot's four corners land exactly on the screen's corners`, () => {
      const { screen } = MOCKUPS[kind];
      const hs = solveHomography(SCREEN_W, SCREEN_H, screen);
      const pairs = [[0, 0, screen.tl], [SCREEN_W, 0, screen.tr], [SCREEN_W, SCREEN_H, screen.br], [0, SCREEN_H, screen.bl]];
      for (const [x, y, [u, v]] of pairs) {
        const [px, py] = applyHomography(hs, x, y);
        close(px, u);
        close(py, v);
      }
    });
  }

  test('the straight-on mockup is a plain shift and scale (no perspective)', () => {
    const hs = solveHomography(SCREEN_W, SCREEN_H, MOCKUPS.front.screen);
    close(hs[6], 0);
    close(hs[7], 0);
  });

  test('the tilted mockup has perspective, and its far edge is shorter than its near edge', () => {
    const { screen } = MOCKUPS.tilt;
    const near = screen.bl[1] - screen.tl[1];
    const far = screen.br[1] - screen.tr[1];
    assert.ok(far < near);
    assert.notEqual(solveHomography(SCREEN_W, SCREEN_H, screen)[6], 0);
  });

  test('the centre of the flat screenshot lands inside the screen', () => {
    const { screen } = MOCKUPS.tilt;
    const [x, y] = applyHomography(solveHomography(SCREEN_W, SCREEN_H, screen), SCREEN_W / 2, SCREEN_H / 2);
    assert.ok(x > screen.tl[0] && x < screen.tr[0]);
    assert.ok(y > screen.tr[1] && y < screen.bl[1]);
  });

  test('flipping swaps sides but keeps the screenshot the right way round', () => {
    const q = MOCKUPS.tilt.screen;
    const f = flipQuad(q, MOCKUPS.tilt.width);
    assert.deepEqual(f.tl, [MOCKUPS.tilt.width - q.tr[0], q.tr[1]]);
    assert.ok(f.tl[0] < f.tr[0], 'the top-left corner stays on the left');
  });

  test('produces a CSS matrix3d with 16 numbers', () => {
    const css = quadToMatrix3d(SCREEN_W, SCREEN_H, MOCKUPS.tilt.screen);
    assert.match(css, /^matrix3d\(/);
    assert.equal(css.slice(9, -1).split(',').length, 16);
  });

  test('growQuad pushes every corner out by the margin and keeps the shape', () => {
    for (const kind of ['front', 'tilt']) {
      const q = MOCKUPS[kind].screen;
      const g = growQuad(q, OVERSCAN);
      assert.ok(g.tl[0] < q.tl[0] && g.tl[1] < q.tl[1]);
      assert.ok(g.br[0] > q.br[0] && g.br[1] > q.br[1]);
      // front: a plain rectangle grows by exactly the margin on each side
      if (kind === 'front') assert.deepEqual([g.tl[0], g.tl[1], g.br[0], g.br[1]].map((n) => +n.toFixed(6)), [q.tl[0] - OVERSCAN, q.tl[1] - OVERSCAN, q.br[0] + OVERSCAN, q.br[1] + OVERSCAN].map((n) => +n.toFixed(6)));
    }
  });

  test('the screenshot layer is rounded a little less than the frame opening (about 15% of the width)', () => {
    assert.ok(SCREEN_RADIUS / SCREEN_W < 0.15 && SCREEN_RADIUS / SCREEN_W > 0.1);
  });

  test('phoneTops: a bottom view leaves the same gap below the phone as the top view leaves above it', () => {
    for (const kind of ['front', 'tilt']) {
      const t = phoneTops(kind, 1170, 2532, 7, 165);
      assert.equal(t.top, 7);
      // a screenshot that fills the screen: the phone's bottom edge (top + height) is 7% above the bottom of the box
      close(t.bottom + 165, 100 - 7, 0.06);
      assert.equal(t.bottom, -72);
    }
  });

  test('phoneTops: the gap is whatever the top view uses', () => {
    close(phoneTops('front', 1170, 2532, 8, 100).bottom + 100, 100 - 8, 0.06);
  });

  test('phoneTops: a screenshot shorter than the screen moves up by less, and one that already ends in the box does not move', () => {
    for (const kind of ['front', 'tilt']) {
      const full = phoneTops(kind, 1000, (SCREEN_H / SCREEN_W) * 1000).bottom;
      const short = phoneTops(kind, 1000, (SCREEN_H / SCREEN_W) * 1000 * 0.8).bottom;
      assert.ok(short > full && short < 7, `${kind}: ${short}`);
      assert.equal(phoneTops(kind, 1000, (SCREEN_H / SCREEN_W) * 1000 * 0.5).bottom, 7);
      // taller than the screen is cropped by it: the same as a full one
      assert.equal(phoneTops(kind, 1000, 5000).bottom, full);
    }
  });

  test('a real iPhone screenshot (a hair shorter than the render screen) counts as full', () => {
    assert.equal(phoneTops('front', 1170, 2532).bottom, -72);
    assert.equal(phoneTops('tilt', 1290, 2796).bottom, -72);
  });

  test('the end of a full screenshot is at the bottom of the screen', () => {
    for (const kind of ['front', 'tilt']) close(contentEndFrac(kind, 1000, (SCREEN_H / SCREEN_W) * 1000), screenSpan(kind).bottom);
  });

  test('a screenshot that is almost screen-shaped is drawn to cover the screen, and others are left alone', () => {
    // real iPhone screenshots: a hair shorter than the render's screen
    for (const [w, h] of [[1170, 2532], [1290, 2796], [1179, 2556]]) assert.ok(fillsScreenByCover(w, h), `${w}x${h}`);
    // exactly screen-shaped, taller (cropped by the screen anyway), or clearly short (the background fills the rest)
    assert.ok(!fillsScreenByCover(SCREEN_W, SCREEN_H));
    assert.ok(!fillsScreenByCover(1000, 5000));
    assert.ok(!fillsScreenByCover(924, 1130));
    // the cover only ever trims a sliver: well under 5% of the width
    assert.ok(screenFill(1170, 2532) > 0.95);
  });
});
