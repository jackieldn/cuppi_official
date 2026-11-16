import 'server-only';

import { headers } from 'next/headers';
import { Timestamp } from 'firebase-admin/firestore';
import { firestore } from '@/firebase/server';
import { clientIp, hourBucket } from './faq-feedback';
import { RATE_LIMIT_COLLECTION, TRUSTED_PROXY_HOPS, ipSubject, rateLimitDocId, withinLimits, type RateRule } from './rate-limit';

/**
 * Counts one attempt against every rule and says whether it may go ahead. Nothing is
 * counted when any rule is already full, so a blocked visitor cannot push the site-wide
 * counter up. Counting and checking happen in one transaction, so a burst of parallel
 * requests cannot slip past the limit together.
 *
 * Throws if Firestore is unreachable; callers should treat that as "not allowed".
 * Counters expire on their own (TTL policy on `expireAt`, see the README).
 */
export async function consumeRateLimits(rules: readonly RateRule[], now = new Date()): Promise<boolean> {
  const hour = hourBucket(now);
  const refs = rules.map((rule) => firestore.collection(RATE_LIMIT_COLLECTION).doc(rateLimitDocId(rule, hour)));
  return firestore.runTransaction(async (tx) => {
    const snaps = await tx.getAll(...refs);
    const counts = snaps.map((snap) => Number(snap.get('count') ?? 0));
    if (!withinLimits(counts, rules)) return false;
    const expireAt = Timestamp.fromMillis(now.getTime() + 2 * 60 * 60 * 1000);
    refs.forEach((ref, i) => tx.set(ref, { count: counts[i] + 1, expireAt }));
    return true;
  });
}

/** The hashed address of whoever is making this request ("unknown" visitors share one bucket, which fails safe). */
export async function requesterSubject(): Promise<string> {
  const secret = process.env.FAQ_FEEDBACK_SALT;
  if (!secret) console.warn('FAQ_FEEDBACK_SALT is not set; rate limit keys fall back to a fixed key.');
  const ip = clientIp((await headers()).get('x-forwarded-for'), TRUSTED_PROXY_HOPS);
  return ipSubject(secret ?? 'rate-limit-fallback-key', ip);
}
