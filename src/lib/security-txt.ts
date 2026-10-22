// security.txt (RFC 9116): tells anyone who finds a security problem in Cuppi
// where to report it. Served at /.well-known/security.txt by
// src/app/(cuppi)/security-txt/route.ts; the human-readable policy is the
// /security page.
//
// EXPIRES is a fixed date on purpose. The RFC requires one, at most a year
// ahead, so that a forgotten file stops being trusted. A date computed at
// request time would never go stale and would defeat that. A unit test
// (tests/unit/security-txt.test.mjs) starts failing 30 days before it lapses:
// re-read the contact details, then move the date on by a year.

export const SECURITY_CONTACT = 'support@cuppi.co.uk';
export const SECURITY_POLICY_URL = 'https://cuppi.co.uk/security';
export const SECURITY_TXT_URL = 'https://cuppi.co.uk/.well-known/security.txt';
export const SECURITY_TXT_EXPIRES = '2027-10-22T00:00:00.000Z';

export function securityTxt(): string {
  return [
    '# How to report a security problem in Cuppi (the app, cuppi.co.uk and its backend).',
    '# Please read the policy first, and do not test against other people\'s data.',
    `Contact: mailto:${SECURITY_CONTACT}`,
    `Expires: ${SECURITY_TXT_EXPIRES}`,
    `Policy: ${SECURITY_POLICY_URL}`,
    'Preferred-Languages: en',
    `Canonical: ${SECURITY_TXT_URL}`,
    '',
  ].join('\n');
}
