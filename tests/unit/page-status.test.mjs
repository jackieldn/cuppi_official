import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { SECTIONS, ALWAYS_LIVE, defaultPageStatus, resolvePageStatus, isLive } from '../../src/lib/page-status.ts';

describe('page status', () => {
  test('the defaults keep home, Cosy Corner, FAQ and support live and refresh the feature pages', () => {
    assert.deepEqual(defaultPageStatus(), { home: 'live', blog: 'live', faq: 'live', support: 'live', features: 'refresh' });
  });

  test('nothing stored, or rubbish, gives the defaults', () => {
    for (const stored of [undefined, null, 'x', 5, []]) assert.deepEqual(resolvePageStatus(stored), defaultPageStatus());
  });

  test('stored switches are used; bad values and unknown keys are ignored', () => {
    const s = resolvePageStatus({ features: 'live', home: 'refresh', faq: 'maybe', support: 3, privacy: 'refresh', updatedAt: 1 });
    assert.equal(s.features, 'live');
    assert.equal(s.home, 'refresh');
    assert.equal(s.faq, 'live'); // bad value: default
    assert.equal(s.support, 'live');
    assert.ok(!('privacy' in s));
  });

  test('legal pages can never be switched off: they are not sections', () => {
    const keys = SECTIONS.map((s) => s.key);
    for (const legal of ['privacy', 'terms', 'family-safety', 'security']) assert.ok(!keys.includes(legal));
    assert.deepEqual(ALWAYS_LIVE.map((l) => l.path), ['/privacy', '/terms', '/family-safety', '/security']);
  });

  test('isLive', () => {
    assert.equal(isLive(defaultPageStatus(), 'home'), true);
    assert.equal(isLive(defaultPageStatus(), 'features'), false);
  });
});
