import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  securityTxt,
  SECURITY_TXT_EXPIRES,
  SECURITY_TXT_URL,
  SECURITY_POLICY_URL,
} from '../../src/lib/security-txt.ts';

const DAY = 24 * 60 * 60 * 1000;

function fields(text) {
  const out = {};
  for (const line of text.split('\n')) {
    if (!line || line.startsWith('#')) continue;
    const i = line.indexOf(': ');
    assert.ok(i > 0, `not a "Field: value" line: ${line}`);
    (out[line.slice(0, i)] ??= []).push(line.slice(i + 2));
  }
  return out;
}

test('has the fields RFC 9116 requires, once each where it says so', () => {
  const f = fields(securityTxt());
  assert.ok(f.Contact?.length >= 1, 'Contact is required');
  for (const c of f.Contact) assert.match(c, /^(mailto:|https:\/\/)/);
  assert.equal(f.Expires?.length, 1, 'Expires is required, exactly once');
  assert.deepEqual(f.Canonical, [SECURITY_TXT_URL]);
  assert.deepEqual(f.Policy, [SECURITY_POLICY_URL]);
});

test('Expires is an ISO 8601 date in UTC', () => {
  assert.equal(new Date(SECURITY_TXT_EXPIRES).toISOString(), SECURITY_TXT_EXPIRES);
});

test('Expires is no more than a year ahead (RFC 9116 recommends at most one year)', () => {
  assert.ok(new Date(SECURITY_TXT_EXPIRES).getTime() - Date.now() <= 366 * DAY);
});

test('Expires is not about to lapse: renew it when this fails', () => {
  // Fails 30 days before the date. Check the contact details are still right,
  // then move SECURITY_TXT_EXPIRES (src/lib/security-txt.ts) on by a year.
  const left = new Date(SECURITY_TXT_EXPIRES).getTime() - Date.now();
  assert.ok(left > 30 * DAY, `security.txt expires in ${Math.floor(left / DAY)} days`);
});

test('ends with a newline and uses no carriage returns', () => {
  const text = securityTxt();
  assert.ok(text.endsWith('\n'));
  assert.ok(!text.includes('\r'));
});
