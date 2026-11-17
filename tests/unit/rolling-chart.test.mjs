import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { tokenise, numbersIn, rollDirection } from '../../src/lib/tools/rolling.ts';
import { niceStep, resampleBalance } from '../../src/lib/tools/chart.ts';

describe('tokenise', () => {
  test('digits are separate and the words and signs between them are runs', () => {
    const t = tokenise('£1,389.58');
    assert.deepEqual(t.map((x) => (x.kind === 'digit' ? x.ch : x.text)), ['£', '1', ',', '3', '8', '9', '.', '5', '8']);
    assert.equal(t.map((x) => (x.kind === 'digit' ? x.ch : x.text)).join(''), '£1,389.58');
  });
  test('digits are numbered from the right, so they keep their place when the number grows', () => {
    const units = (s) => tokenise(s).find((x) => x.kind === 'digit' && x.ordinal === 0).ch;
    assert.equal(units('£999'), '9');
    assert.equal(units('£1,000'), '0');
    const ordinals = tokenise('£1,000').filter((x) => x.kind === 'digit').map((x) => x.ordinal);
    assert.deepEqual(ordinals, [3, 2, 1, 0]);
  });
  test('text with no digits is one run, and nothing is lost', () => {
    assert.deepEqual(tokenise('–'), [{ kind: 'text', text: '–', ordinal: 0 }]);
    assert.deepEqual(tokenise(''), []);
    const s = '25 years 3 months';
    assert.equal(tokenise(s).map((x) => (x.kind === 'digit' ? x.ch : x.text)).join(''), s);
  });
});

describe('rollDirection', () => {
  test('a bigger figure rolls up, a smaller one down', () => {
    assert.equal(rollDirection('£1,000', '£1,500'), 'up');
    assert.equal(rollDirection('£1,500', '£999'), 'down');
  });
  test('it is the whole figure that counts, not the digit, so a carry rolls the right way', () => {
    assert.equal(rollDirection('£1,099', '£1,100'), 'up');
    assert.equal(rollDirection('£1,100', '£1,099'), 'down');
  });
  test('with years and months, the first number that changed decides', () => {
    assert.equal(numbersIn('25 years 3 months').join(), '25,3');
    assert.equal(rollDirection('25 years 3 months', '25 years 1 month'), 'down');
    assert.equal(rollDirection('18 years 10 months', '22 years'), 'up');
  });
  test('nothing comparable rolls up', () => {
    assert.equal(rollDirection('–', '£5'), 'up');
    assert.equal(rollDirection('£5', '£5'), 'up');
  });
});

describe('chart helpers', () => {
  test('niceStep gives round steps', () => {
    assert.equal(niceStep(250_000, 4), 100_000);
    assert.equal(niceStep(10_000, 4), 2_500);
    assert.equal(niceStep(0, 4) > 0, true);
  });
  const pts = [0, 1, 2, 3, 4].map((m) => ({ month: m, balance: 100 - m * 25 }));
  test('resampling keeps the ends and interpolates between', () => {
    assert.deepEqual(resampleBalance(pts, 4, 5), [100, 75, 50, 25, 0]);
    const r = resampleBalance(pts, 4, 9);
    assert.equal(r[1], 87.5);
    assert.equal(r.length, 9);
  });
  test('a series that ends before the chart does stays at its last value', () => {
    assert.deepEqual(resampleBalance(pts, 8, 5), [100, 50, 0, 0, 0]);
  });
  test('no points is all zeros', () => assert.deepEqual(resampleBalance([], 10, 3), [0, 0, 0]));
});
