import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { supportFormSchema, SUPPORT_LIMITS } from '../../src/lib/support-schema.ts';
import { BetaSignupInputSchema } from '../../src/lib/beta-signup-schema.ts';

describe('support form schema', () => {
  const good = { name: 'Sam', email: 'sam@example.com', category: 'Bug Report', message: 'The app crashes on launch.' };
  const accepts = (v) => supportFormSchema.safeParse(v).success;

  test('a valid submission is accepted', () => assert.ok(accepts(good)));
  test('an unknown category is rejected', () => assert.ok(!accepts({ ...good, category: 'Free money' })));
  test('a category carrying CRLF header injection is rejected', () =>
    assert.ok(!accepts({ ...good, category: 'Bug Report\r\nBcc: x@y.z' })));
  test('over-long fields are rejected', () => {
    assert.ok(!accepts({ ...good, name: 'a'.repeat(SUPPORT_LIMITS.name + 1) }));
    assert.ok(!accepts({ ...good, message: 'x'.repeat(1_000_000) }));
    assert.ok(!accepts({ ...good, email: 'a'.repeat(250) + '@example.com' }));
  });
  test('a message exactly at the limit is accepted', () =>
    assert.ok(accepts({ ...good, message: 'x'.repeat(SUPPORT_LIMITS.message) })));
});

describe('beta signup schema', () => {
  const accepts = (v) => BetaSignupInputSchema.safeParse(v).success;

  test('a valid signup is accepted', () =>
    assert.ok(accepts({ email: 'a@b.co', interestedFeatures: ['Budgets', 'Birthdays'] })));
  test('unknown, empty, huge and malformed input is rejected', () => {
    assert.ok(!accepts({ email: 'a@b.co', interestedFeatures: ['<script>'] }));
    assert.ok(!accepts({ email: 'a@b.co', interestedFeatures: [] }));
    assert.ok(!accepts({ email: 'a@b.co', interestedFeatures: Array(10000).fill('Budgets') }));
    assert.ok(!accepts({ email: 'nope', interestedFeatures: ['Budgets'] }));
  });
});
