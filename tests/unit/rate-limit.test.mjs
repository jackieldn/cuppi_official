import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { RATE_LIMITS, rateLimitDocId, withinLimits, ipSubject } from '../../src/lib/rate-limit.ts';

describe('withinLimits', () => {
  const rules = [{ limit: 5 }, { limit: 60 }];

  test('allows while every counter is under its limit', () => {
    assert.equal(withinLimits([0, 0], rules), true);
    assert.equal(withinLimits([4, 59], rules), true);
  });
  test('refuses as soon as any one counter is full', () => {
    assert.equal(withinLimits([5, 0], rules), false);
    assert.equal(withinLimits([0, 60], rules), false);
    assert.equal(withinLimits([99, 99], rules), false);
  });
  test('a missing count reads as zero', () => {
    assert.equal(withinLimits([], rules), true);
  });
  test('the Nth attempt is the last one let through', () => {
    // Counting 5 attempts: counts seen are 0,1,2,3,4 (all allowed), then 5 (refused).
    for (let seen = 0; seen < RATE_LIMITS.support.ip; seen++) assert.equal(withinLimits([seen], [{ limit: RATE_LIMITS.support.ip }]), true);
    assert.equal(withinLimits([RATE_LIMITS.support.ip], [{ limit: RATE_LIMITS.support.ip }]), false);
  });
});

describe('rateLimitDocId', () => {
  test('is different per scope, visitor and hour', () => {
    const a = rateLimitDocId({ scope: 'support-ip', subject: 'abc' }, '2026-11-16T09');
    assert.notEqual(a, rateLimitDocId({ scope: 'signup-ip', subject: 'abc' }, '2026-11-16T09'));
    assert.notEqual(a, rateLimitDocId({ scope: 'support-ip', subject: 'abd' }, '2026-11-16T09'));
    assert.notEqual(a, rateLimitDocId({ scope: 'support-ip', subject: 'abc' }, '2026-11-16T10'));
  });
});

describe('ipSubject', () => {
  test('is stable for the same address and key', () => {
    assert.equal(ipSubject('k', '203.0.113.7'), ipSubject('k', '203.0.113.7'));
  });
  test('differs per address and per key, and is safe inside a document id', () => {
    assert.notEqual(ipSubject('k', '203.0.113.7'), ipSubject('k', '203.0.113.8'));
    assert.notEqual(ipSubject('k', '203.0.113.7'), ipSubject('other', '203.0.113.7'));
    assert.match(ipSubject('k', '2001:db8::1'), /^[0-9a-f]{32}$/);
  });
  test('does not contain the address', () => {
    assert.ok(!ipSubject('k', '203.0.113.7').includes('203'));
  });
});
