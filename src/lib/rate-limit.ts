// Hourly request limits for the public forms that write to something we pay
// for or read ourselves (the support form sends an email, the beta signup
// stores a row). A CAPTCHA alone does not cap volume: a person, or a service
// that sells solved CAPTCHAs, can still send hundreds.
//
// Counting happens in Firestore (see rate-limit-server.ts) because the site can
// run on more than one instance and an in-memory counter would reset on every
// restart. This file is the pure part: which counters a request touches and
// whether the counts so far allow it. No Firebase imports, so Node's test runner
// can load it. Keep imports relative.

import { createHmac } from 'node:crypto';

/** Firestore collection holding the counters. Clients can never touch it (firestore.rules). */
export const RATE_LIMIT_COLLECTION = 'rate_limits';

/** How many proxies sit between the internet and this server. See clientIp() in faq-feedback.ts. */
export const TRUSTED_PROXY_HOPS = 1;

/**
 * Attempts per hour. "ip" is per visitor address; "site" is everyone together, so a
 * spammer who keeps changing address still hits it. A real person sends a message or
 * two; the site-wide numbers sit well above any honest day.
 */
export const RATE_LIMITS = {
  support: { ip: 5, site: 60 },
  signup: { ip: 5, site: 300 },
  // Across every locked project at once: stops one address spreading guesses over many
  // projects (each unlock check costs a slow PBKDF2 hash) to slip under the per-project limit.
  unlockAny: { ip: 40 },
} as const;

export type RateRule = {
  /** What is being counted, e.g. "support-ip". Letters, digits and dashes only. */
  scope: string;
  /** Who it is counted for: a hashed address, or "all" for the whole site. */
  subject: string;
  /** The most attempts allowed in one hour. */
  limit: number;
};

/** The Firestore document id of one counter for one hour. Always safe inside a document path. */
export function rateLimitDocId(rule: Pick<RateRule, 'scope' | 'subject'>, hour: string): string {
  return `${rule.scope}_${rule.subject}_${hour}`;
}

/** True when every counter is still under its limit (counts line up with rules, by index). */
export function withinLimits(counts: readonly number[], rules: readonly Pick<RateRule, 'limit'>[]): boolean {
  return rules.every((rule, i) => (counts[i] ?? 0) < rule.limit);
}

/**
 * An opaque id for "this address": a keyed hash, so the address itself is never stored
 * (the counters are deleted within two hours, but there is no reason to write it down).
 * `secret` is the site's existing FAQ_FEEDBACK_SALT; the "rate-limit|" prefix keeps these
 * hashes separate from the FAQ voter hashes made with the same key.
 */
export function ipSubject(secret: string, ip: string): string {
  return createHmac('sha256', secret).update(`rate-limit|${ip}`).digest('hex').slice(0, 32);
}
