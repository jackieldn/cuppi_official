// Rules for the "Was this helpful?" votes on FAQ answers. There are no accounts,
// so nothing here can stop a determined spammer. The goal is that spam costs
// effort, cannot hurt the database or the bill, and gains nothing: votes are
// private, so they never change what the site shows anyone.
//
// Pure functions (plus node:crypto), so Node's test runner can load this file.
// Server-side only: it handles the secret used to hash visitors.

import { createHmac } from 'node:crypto';
import { z } from 'zod';

/** What the browser sends. Validated on the server; the action never trusts its argument. */
export const feedbackInputSchema = z.object({
  // A Sanity document id. Restricted so it is always safe inside a Firestore document id.
  answerId: z.string().regex(/^[A-Za-z0-9._-]{1,80}$/),
  helpful: z.boolean(),
  // Honeypot: hidden from people, so only a bot filling every field puts anything here.
  website: z.string().max(200).optional(),
});

export type FeedbackInput = z.infer<typeof feedbackInputSchema>;

// Attempts per hour before a visitor must solve a CAPTCHA (soft) or is turned
// away even with one (hard). Real visitors rate a handful of answers.
export const SOFT_LIMITS = { visitor: 20, answer: 100, site: 600 } as const;
export const HARD_LIMITS = { visitor: 100, answer: 500, site: 2000 } as const;

export type Counts = { visitor: number; answer: number; site: number };

/**
 * Whether this attempt may go ahead, given how many attempts were already made
 * this hour by the same visitor, on the same answer, and on the whole site. The
 * answer and site counters do not depend on who the visitor claims to be, so a
 * spammer who keeps changing identity still hits them.
 */
export function rateLimitTier(counts: Counts, captchaPassed: boolean): 'ok' | 'captcha' | 'blocked' {
  const keys = ['visitor', 'answer', 'site'] as const;
  if (keys.some((k) => counts[k] >= HARD_LIMITS[k])) return 'blocked';
  if (keys.some((k) => counts[k] >= SOFT_LIMITS[k])) return captchaPassed ? 'ok' : 'captcha';
  return 'ok';
}

export type Tally = { up: number; down: number };

export type TallyUpdate = Tally & { total: number; helpfulPct: number | null; changed: boolean };

/**
 * The new totals for an answer after a visitor votes. A visitor's vote counts
 * once per answer: voting again with the same choice changes nothing, and
 * switching moves their vote from one side to the other.
 */
export function planVote(previous: boolean | null, next: boolean, tally: Tally | null): TallyUpdate {
  let up = Math.max(0, tally?.up ?? 0);
  let down = Math.max(0, tally?.down ?? 0);
  const changed = previous !== next;
  if (changed) {
    if (previous === true) up = Math.max(0, up - 1);
    if (previous === false) down = Math.max(0, down - 1);
    if (next) up += 1;
    else down += 1;
  }
  const total = up + down;
  return { up, down, total, helpfulPct: total === 0 ? null : Math.round((up / total) * 100), changed };
}

const pad = (n: number) => String(n).padStart(2, '0');

/** UTC hour, e.g. "2026-10-14T09". Rate limits count per hour. */
export function hourBucket(date: Date): string {
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}T${pad(date.getUTCHours())}`;
}

/** UTC month, e.g. "2026-10". Visitor hashes change monthly, so they cannot be followed for long. */
export function monthBucket(date: Date): string {
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}`;
}

/**
 * The visitor's address from X-Forwarded-For. Each proxy appends the address it
 * received the request from, so the left side is whatever the visitor chose to
 * send and cannot be trusted. Counting in from the right skips the proxies we
 * run behind (`trustedHops`) and lands on the address our own infrastructure saw.
 * Returns "unknown" when there is nothing usable; unknown visitors then share one
 * bucket, which fails safe.
 */
export function clientIp(forwardedFor: string | null | undefined, trustedHops = 1): string {
  const parts = (forwardedFor ?? '')
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length === 0) return 'unknown';
  const picked = parts[Math.max(0, parts.length - 1 - trustedHops)];
  return /^[0-9a-fA-F:.]{2,45}$/.test(picked) ? picked.toLowerCase() : 'unknown';
}

/**
 * An opaque, non-reversible id for "this browser this month": a keyed hash of
 * the address and user agent. The address itself is never stored, and without
 * the secret the hash cannot be brute-forced back to one (there are only four
 * billion IPv4 addresses, so a plain hash would not be safe).
 */
export function voterHash(secret: string, parts: { ip: string; userAgent: string; now: Date }): string {
  return createHmac('sha256', secret)
    .update(`${monthBucket(parts.now)}|${parts.ip}|${parts.userAgent.slice(0, 200)}`)
    .digest('hex')
    .slice(0, 32);
}
