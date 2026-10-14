'use server';

import { headers } from 'next/headers';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { firestore } from '@/firebase/server';
import { getFaqModel } from '@/lib/faq';
import { clientIp, feedbackInputSchema, hourBucket, planVote, rateLimitTier, voterHash } from '@/lib/faq-feedback';
import { verifyRecaptcha } from '@/lib/recaptcha';

export type FeedbackResult =
  | { status: 'saved'; helpful: boolean }
  // Too many votes from this visitor (or on this answer): solve a CAPTCHA and send again.
  | { status: 'captcha' }
  | { status: 'error'; message: string };

// How many proxies sit between the internet and this server. See clientIp().
const TRUSTED_PROXY_HOPS = 1;

const ERROR_GENERIC: FeedbackResult = { status: 'error', message: 'We could not save your feedback. Please try again later.' };

/**
 * Records a thumbs up or down on an FAQ answer. Votes are private (the site never
 * shows them), stored once per visitor per answer, and rate limited. Totals are
 * read in the Firebase console: the `faq_feedback` collection, one document per
 * answer. Clients cannot touch these collections (see firestore.rules).
 */
export async function submitFaqFeedback(input: unknown, captchaToken?: string): Promise<FeedbackResult> {
  const parsed = feedbackInputSchema.safeParse(input);
  if (!parsed.success) return { status: 'error', message: 'Invalid feedback.' };
  const { answerId, helpful, website } = parsed.data;

  // A hidden field only a bot fills in. Say "saved" so it learns nothing, and store nothing.
  if (website) return { status: 'saved', helpful };

  const secret = process.env.FAQ_FEEDBACK_SALT;
  if (!secret) {
    console.error('FAQ_FEEDBACK_SALT is not set; FAQ feedback is disabled.');
    return ERROR_GENERIC;
  }

  try {
    // Only real answers can be voted on, so made-up ids cannot create documents.
    const entry = (await getFaqModel()).entries.find((e) => e.id === answerId);
    if (!entry) return { status: 'error', message: 'That answer no longer exists.' };

    const captchaPassed = captchaToken ? await verifyRecaptcha(captchaToken) : false;
    if (captchaToken && !captchaPassed) return { status: 'error', message: 'CAPTCHA check failed. Please try again.' };

    const requestHeaders = await headers();
    const now = new Date();
    const voter = voterHash(secret, {
      ip: clientIp(requestHeaders.get('x-forwarded-for'), TRUSTED_PROXY_HOPS),
      userAgent: requestHeaders.get('user-agent') ?? '',
      now,
    });
    const hour = hourBucket(now);

    const votes = firestore.collection('faq_feedback_votes').doc(`${entry.id}_${voter}`);
    const totals = firestore.collection('faq_feedback').doc(entry.id);
    const limits = firestore.collection('faq_feedback_limits');
    const visitorLimit = limits.doc(`v_${voter}_${hour}`);
    const answerLimit = limits.doc(`a_${entry.id}_${hour}`);
    const siteLimit = limits.doc(`site_${hour}`);

    // One transaction, so the limits, the vote and the totals can never disagree.
    const outcome = await firestore.runTransaction(async (tx) => {
      const [vote, total, visitorSnap, answerSnap, siteSnap] = await tx.getAll(votes, totals, visitorLimit, answerLimit, siteLimit);
      const counts = {
        visitor: Number(visitorSnap.get('count') ?? 0),
        answer: Number(answerSnap.get('count') ?? 0),
        site: Number(siteSnap.get('count') ?? 0),
      };
      const tier = rateLimitTier(counts, captchaPassed);
      if (tier !== 'ok') return tier;

      const next = planVote(vote.exists ? (vote.get('helpful') as boolean) : null, helpful, total.exists ? { up: Number(total.get('up') ?? 0), down: Number(total.get('down') ?? 0) } : null);

      // Counters expire (set a TTL policy on `expireAt`, see the README).
      const expireAt = Timestamp.fromMillis(now.getTime() + 2 * 60 * 60 * 1000);
      tx.set(visitorLimit, { count: counts.visitor + 1, expireAt });
      tx.set(answerLimit, { count: counts.answer + 1, expireAt });
      tx.set(siteLimit, { count: counts.site + 1, expireAt });

      tx.set(votes, {
        answerId: entry.id,
        helpful,
        createdAt: vote.exists ? vote.get('createdAt') : FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
      if (next.changed || !total.exists) {
        tx.set(totals, {
          question: entry.question,
          up: next.up,
          down: next.down,
          total: next.total,
          helpfulPct: next.helpfulPct,
          updatedAt: FieldValue.serverTimestamp(),
        });
      }
      return 'ok' as const;
    });

    if (outcome === 'captcha') return { status: 'captcha' };
    if (outcome === 'blocked') return { status: 'error', message: 'Too much feedback right now. Please try again later.' };
    return { status: 'saved', helpful };
  } catch (error) {
    console.error('Saving FAQ feedback failed:', error);
    return ERROR_GENERIC;
  }
}
