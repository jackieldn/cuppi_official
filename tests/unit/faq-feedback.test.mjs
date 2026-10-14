import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  feedbackInputSchema, rateLimitTier, planVote, hourBucket, monthBucket, clientIp, voterHash, SOFT_LIMITS, HARD_LIMITS,
} from '../../src/lib/faq-feedback.ts';

const ID = '03f8d068-b666-4937-915d-d3b2660ec2d1';
const calm = { visitor: 0, answer: 0, site: 0 };

describe('feedbackInputSchema', () => {
  test('accepts a real vote', () => {
    assert.ok(feedbackInputSchema.safeParse({ answerId: ID, helpful: true }).success);
    assert.ok(feedbackInputSchema.safeParse({ answerId: ID, helpful: false, website: '' }).success);
  });
  test('rejects ids that could escape a document path or be abusive', () => {
    for (const answerId of ['', 'a/b', '../x', 'a b', 'x'.repeat(81), '<script>', 'a\nb', 42, null, undefined]) {
      assert.ok(!feedbackInputSchema.safeParse({ answerId, helpful: true }).success, String(answerId));
    }
  });
  test('the vote must be a real boolean, not a truthy string', () => {
    for (const helpful of ['true', 1, 'yes', null, undefined]) {
      assert.ok(!feedbackInputSchema.safeParse({ answerId: ID, helpful }).success, String(helpful));
    }
  });
  test('rejects a missing or non-object body', () => {
    for (const body of [null, undefined, 'x', 5, []]) assert.ok(!feedbackInputSchema.safeParse(body).success);
  });
  test('an absurdly long honeypot value is rejected rather than stored or echoed', () => {
    assert.ok(!feedbackInputSchema.safeParse({ answerId: ID, helpful: true, website: 'x'.repeat(201) }).success);
  });
});

describe('rateLimitTier', () => {
  test('normal use goes straight through', () => {
    assert.equal(rateLimitTier(calm, false), 'ok');
    assert.equal(rateLimitTier({ visitor: SOFT_LIMITS.visitor - 1, answer: 5, site: 5 }, false), 'ok');
  });
  test('asks for a CAPTCHA once any soft limit is reached, and accepts one', () => {
    for (const key of ['visitor', 'answer', 'site']) {
      const counts = { ...calm, [key]: SOFT_LIMITS[key] };
      assert.equal(rateLimitTier(counts, false), 'captcha', key);
      assert.equal(rateLimitTier(counts, true), 'ok', key);
    }
  });
  test('turns people away at the hard limit even with a CAPTCHA', () => {
    for (const key of ['visitor', 'answer', 'site']) {
      const counts = { ...calm, [key]: HARD_LIMITS[key] };
      assert.equal(rateLimitTier(counts, true), 'blocked', key);
      assert.equal(rateLimitTier(counts, false), 'blocked', key);
    }
  });
  test('hard limits sit above soft limits, so the CAPTCHA step is reachable', () => {
    for (const key of ['visitor', 'answer', 'site']) assert.ok(HARD_LIMITS[key] > SOFT_LIMITS[key]);
  });
  test('a spammer who changes identity every time still hits the answer and site limits', () => {
    // Fresh visitor each time (visitor count 0), but the shared counters keep rising.
    assert.equal(rateLimitTier({ visitor: 0, answer: SOFT_LIMITS.answer, site: 0 }, false), 'captcha');
    assert.equal(rateLimitTier({ visitor: 0, answer: 0, site: HARD_LIMITS.site }, true), 'blocked');
  });
});

describe('planVote', () => {
  test('a first thumbs up and a first thumbs down', () => {
    assert.deepEqual(planVote(null, true, null), { up: 1, down: 0, total: 1, helpfulPct: 100, changed: true });
    assert.deepEqual(planVote(null, false, { up: 3, down: 1 }), { up: 3, down: 2, total: 5, helpfulPct: 60, changed: true });
  });
  test('voting the same way again changes nothing', () => {
    const r = planVote(true, true, { up: 4, down: 2 });
    assert.deepEqual([r.up, r.down, r.changed], [4, 2, false]);
  });
  test('switching a vote moves it from one side to the other', () => {
    assert.deepEqual(planVote(true, false, { up: 4, down: 2 }), { up: 3, down: 3, total: 6, helpfulPct: 50, changed: true });
    assert.deepEqual(planVote(false, true, { up: 4, down: 2 }), { up: 5, down: 1, total: 6, helpfulPct: 83, changed: true });
  });
  test('totals never go negative, even if stored data is wrong', () => {
    const r = planVote(true, false, { up: 0, down: 0 });
    assert.deepEqual([r.up, r.down], [0, 1]);
    assert.deepEqual([planVote(null, true, { up: -5, down: -5 }).up, planVote(null, true, { up: -5, down: -5 }).down], [1, 0]);
  });
  test('no votes means no percentage', () => assert.equal(planVote(true, true, { up: 0, down: 0 }).helpfulPct, null));
  test('one visitor flipping back and forth cannot move the totals beyond one vote', () => {
    let tally = null, prev = null;
    for (const choice of [true, false, true, false, false, true]) {
      const r = planVote(prev, choice, tally);
      tally = { up: r.up, down: r.down };
      prev = choice;
    }
    assert.equal(tally.up + tally.down, 1);
  });
});

describe('time buckets', () => {
  test('hours and months are UTC and zero padded', () => {
    const d = new Date('2026-03-05T07:59:59Z');
    assert.equal(hourBucket(d), '2026-03-05T07');
    assert.equal(monthBucket(d), '2026-03');
    assert.equal(hourBucket(new Date('2026-12-31T23:00:00Z')), '2026-12-31T23');
  });
});

describe('clientIp', () => {
  test('takes the address our own infrastructure saw, counting in from the right', () => {
    assert.equal(clientIp('203.0.113.7, 130.211.0.1', 1), '203.0.113.7');
    assert.equal(clientIp('203.0.113.7', 1), '203.0.113.7');
  });
  test('ignores addresses the visitor invented on the left', () => {
    assert.equal(clientIp('1.1.1.1, 2.2.2.2, 203.0.113.7, 130.211.0.1', 1), '203.0.113.7');
    assert.equal(clientIp('evil, <script>, 203.0.113.7, 130.211.0.1', 1), '203.0.113.7');
  });
  test('handles IPv6', () => assert.equal(clientIp('2001:DB8::1, 130.211.0.1', 1), '2001:db8::1'));
  test('a missing, empty or malformed header becomes one shared "unknown" bucket', () => {
    for (const h of [null, undefined, '', ' , ', 'not an ip', '1.2.3.4.5.6.7.8.9.0.1.2.3.4.5.6.7.8.9.0.1.2.3.4.5.6.7.8.9.0.1.2.3.4.5.6.7.8.9.0.1']) {
      assert.equal(clientIp(h, 0), 'unknown', String(h));
    }
  });
});

describe('voterHash', () => {
  const now = new Date('2026-10-14T10:00:00Z');
  const base = { ip: '203.0.113.7', userAgent: 'Mozilla/5.0', now };
  const hash = voterHash('secret-a', base);

  test('is a fixed-length hex id that contains neither the address nor the user agent', () => {
    assert.match(hash, /^[0-9a-f]{32}$/);
    assert.ok(!hash.includes('203'));
  });
  test('is the same for the same browser within a month', () => {
    assert.equal(voterHash('secret-a', { ...base, now: new Date('2026-10-31T23:59:00Z') }), hash);
  });
  test('changes with the address, the user agent, the month and the secret', () => {
    assert.notEqual(voterHash('secret-a', { ...base, ip: '203.0.113.8' }), hash);
    assert.notEqual(voterHash('secret-a', { ...base, userAgent: 'Other' }), hash);
    assert.notEqual(voterHash('secret-a', { ...base, now: new Date('2026-11-01T00:00:00Z') }), hash);
    assert.notEqual(voterHash('secret-b', base), hash);
  });
  test('a very long user agent cannot change the result beyond its first 200 characters', () => {
    const long = 'x'.repeat(200);
    assert.equal(voterHash('s', { ...base, userAgent: long + 'A' }), voterHash('s', { ...base, userAgent: long + 'B' }));
  });
});
