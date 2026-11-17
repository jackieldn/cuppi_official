import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readNumber, problemsOf } from '../../src/lib/tools/validate.ts';

describe('readNumber', () => {
  test('a good number comes back with no error', () => {
    assert.deepEqual(readNumber('£250,000', { label: 'the amount', min: 1 }), { value: 250000, error: null });
  });
  test('empty, not a number, too small and too big each say so in words', () => {
    assert.equal(readNumber('', { label: 'the amount' }).error, 'Enter the amount.');
    assert.match(readNumber('abc', { label: 'the amount' }).error, /^The amount should be a number/);
    assert.equal(readNumber('0', { label: 'the amount', min: 1 }).error, 'The amount should be at least 1.');
    assert.equal(readNumber('99', { label: 'the rate', max: 25 }).error, 'The rate should be no more than 25.');
  });
  test('whole numbers only when asked', () => {
    assert.equal(readNumber('3.5', { label: 'the month', integer: true }).error, 'The month should be a whole number.');
    assert.equal(readNumber('3', { label: 'the month', integer: true }).error, null);
  });
  test('a failed read has no value to use', () => assert.ok(Number.isNaN(readNumber('x', { label: 'x' }).value)));
  test('problemsOf lists each message once', () => {
    const bad = readNumber('', { label: 'the amount' });
    assert.deepEqual(problemsOf(bad, bad, readNumber('5', { label: 'x' }), null), ['Enter the amount.']);
  });
});
