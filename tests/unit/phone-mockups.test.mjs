import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { MOCKUPS, SCREEN_W, SCREEN_H, solveHomography, applyHomography, quadToMatrix3d, flipQuad } from '../../src/lib/phone-mockups.ts';

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
});
