import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { BANNER_LIMITS, isActive, isDay, newBanner, phaseOf, pickBanner, resolveBanners, ukDay, validateBanners } from '../../src/lib/banners.ts';

const STORAGE = 'https://firebasestorage.googleapis.com/v0/b/studio-5700093446-89b93.firebasestorage.app/o/cuppi_home%2Ficon.png?alt=media';
const b = (over = {}) => ({ id: 'a', text: 'Hello', start: '2026-12-01', end: '2026-12-07', colour: 'honey', iconUrl: '', href: '', ...over });

describe('banner days', () => {
  test('isDay accepts real calendar days only', () => {
    assert.equal(isDay('2026-12-01'), true);
    assert.equal(isDay('2028-02-29'), true);
    for (const bad of ['2026-02-30', '2026-13-01', '2026-1-1', '', 'tomorrow', null, 20261201]) assert.equal(isDay(bad), false);
  });

  test('ukDay is the UK date, not the server date', () => {
    // 23:30 UTC on 30 June is already 00:30 on 1 July in the UK (summer time, UTC+1).
    assert.equal(ukDay(new Date('2026-06-30T23:30:00Z')), '2026-07-01');
    // In winter the UK is on UTC, so the dates agree.
    assert.equal(ukDay(new Date('2026-12-01T23:30:00Z')), '2026-12-01');
  });
});

describe('when a banner is active', () => {
  test('both the first and the last day are included', () => {
    assert.equal(isActive(b(), '2026-11-30'), false);
    assert.equal(isActive(b(), '2026-12-01'), true);
    assert.equal(isActive(b(), '2026-12-07'), true);
    assert.equal(isActive(b(), '2026-12-08'), false);
  });

  test('phaseOf', () => {
    assert.equal(phaseOf(b(), '2026-11-30'), 'scheduled');
    assert.equal(phaseOf(b(), '2026-12-03'), 'live');
    assert.equal(phaseOf(b(), '2026-12-08'), 'ended');
  });

  test('pickBanner shows nothing when nothing is scheduled for today', () => {
    assert.equal(pickBanner([], '2026-12-03'), null);
    assert.equal(pickBanner([b()], '2027-01-01'), null);
  });

  test('when banners overlap, the one that started most recently wins', () => {
    const older = b({ id: 'older', start: '2026-12-01', end: '2026-12-31' });
    const newer = b({ id: 'newer', start: '2026-12-05', end: '2026-12-07' });
    assert.equal(pickBanner([older, newer], '2026-12-06').id, 'newer');
    assert.equal(pickBanner([newer, older], '2026-12-06').id, 'newer');
    assert.equal(pickBanner([older, newer], '2026-12-10').id, 'older'); // the newer one has ended
  });
});

describe('resolveBanners', () => {
  test('nothing stored, or rubbish, gives no banners', () => {
    for (const stored of [undefined, null, 'x', 5, [], {}, { items: 'no' }]) assert.deepEqual(resolveBanners(stored), []);
  });

  test('a good banner comes back as it was written', () => {
    const [one] = resolveBanners({ items: [b({ colour: 'lake', iconUrl: STORAGE, href: '/pricing' })] });
    assert.deepEqual(one, b({ colour: 'lake', iconUrl: STORAGE, href: '/pricing' }));
  });

  test('entries with no words, bad dates or an end before the start are dropped', () => {
    const items = [b({ text: '  ' }), b({ start: 'soon' }), b({ end: '2026-02-30' }), b({ start: '2026-12-07', end: '2026-12-01' }), 'x', null, b({ id: 'ok' })];
    assert.deepEqual(resolveBanners({ items }).map((x) => x.id), ['ok']);
  });

  test('a one-day banner (start = end) is fine', () => {
    assert.equal(resolveBanners({ items: [b({ start: '2026-12-01', end: '2026-12-01' })] }).length, 1);
  });

  test('an unknown colour becomes honey', () => {
    assert.equal(resolveBanners({ items: [b({ colour: 'neon' })] })[0].colour, 'honey');
  });

  test('unsafe links and icons are cleared, not trusted', () => {
    const [one] = resolveBanners({ items: [b({ href: 'javascript:alert(1)', iconUrl: 'https://evil.example/x.png' })] });
    assert.equal(one.href, '');
    assert.equal(one.iconUrl, '');
    assert.equal(resolveBanners({ items: [b({ href: '//evil.example' })] })[0].href, '');
    assert.equal(resolveBanners({ items: [b({ href: 'https://example.com/x' })] })[0].href, 'https://example.com/x');
  });

  test('words are trimmed and capped; repeated ids are made unique; the list is capped', () => {
    const [long] = resolveBanners({ items: [b({ text: `  ${'x'.repeat(500)}  ` })] });
    assert.equal(long.text.length, BANNER_LIMITS.text);
    const twins = resolveBanners({ items: [b(), b()] });
    assert.notEqual(twins[0].id, twins[1].id);
    const many = resolveBanners({ items: Array.from({ length: 50 }, (_, i) => b({ id: `b${i}` })) });
    assert.equal(many.length, BANNER_LIMITS.items);
  });
});

describe('validateBanners', () => {
  test('a good list has no problems', () => {
    assert.deepEqual(validateBanners([b(), b({ href: 'https://example.com' })]), []);
  });

  test('says what is wrong in plain English', () => {
    const problems = validateBanners([b({ text: '' }), b({ start: '' }), b({ end: '' }), b({ start: '2026-12-07', end: '2026-12-01' }), b({ href: 'pricing' })]);
    assert.equal(problems.length, 5);
    assert.match(problems[0], /needs some words/);
    assert.match(problems[1], /start date/);
    assert.match(problems[2], /end date/);
    assert.match(problems[3], /before the start/);
    assert.match(problems[4], /link must start with/);
  });
});

describe('newBanner', () => {
  test('starts today and runs a week (both days included)', () => {
    const n = newBanner('x', '2026-12-28');
    assert.equal(n.start, '2026-12-28');
    assert.equal(n.end, '2027-01-03');
    assert.equal(n.text, '');
  });
});
