'use server';

import { headers } from 'next/headers';
import { Timestamp } from 'firebase-admin/firestore';
import { z } from 'zod';
import { firestore } from '@/firebase/server';
import { clientIp, hourBucket } from '@/lib/faq-feedback';
import { PROJECT_SECRETS_COLLECTION, pickLockedContent, verifyPassword, type PasswordHash } from '@/lib/project-lock';

export type UnlockResult =
  | { status: 'unlocked'; content: Record<string, unknown> }
  | { status: 'wrong' }
  | { status: 'limited' }
  | { status: 'error' };

const inputSchema = z.object({
  // A Firestore auto id (or a hand-picked slug-like id). Safe inside a document path.
  projectId: z.string().regex(/^[A-Za-z0-9_-]{1,128}$/),
  password: z.string().min(1).max(200),
});

// Wrong-or-right attempts per hour, per visitor per project and per project overall.
const LIMITS = { visitor: 10, project: 100 } as const;
const TRUSTED_PROXY_HOPS = 1;

/**
 * Checks a project key on the server and, only if it matches, returns the locked
 * content from `project_secrets/{projectId}` (which no client can read).
 */
export async function unlockProject(input: unknown): Promise<UnlockResult> {
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) return { status: 'wrong' };
  const { projectId, password } = parsed.data;

  try {
    const now = new Date();
    const hour = hourBucket(now);
    const ip = clientIp((await headers()).get('x-forwarded-for'), TRUSTED_PROXY_HOPS);
    const limits = firestore.collection('project_unlock_limits');
    // IPv6 colons are fine in a document id; only "/" is not, and clientIp never returns one.
    const visitorLimit = limits.doc(`v_${projectId}_${ip}_${hour}`);
    const projectLimit = limits.doc(`p_${projectId}_${hour}`);

    // Count the attempt before checking it, so parallel guesses cannot skip the limit.
    const allowed = await firestore.runTransaction(async (tx) => {
      const [v, p] = await tx.getAll(visitorLimit, projectLimit);
      const visitor = Number(v.get('count') ?? 0);
      const project = Number(p.get('count') ?? 0);
      if (visitor >= LIMITS.visitor || project >= LIMITS.project) return false;
      // Counters expire (TTL policy on `expireAt`, same as faq_feedback_limits).
      const expireAt = Timestamp.fromMillis(now.getTime() + 2 * 60 * 60 * 1000);
      tx.set(visitorLimit, { count: visitor + 1, expireAt });
      tx.set(projectLimit, { count: project + 1, expireAt });
      return true;
    });
    if (!allowed) return { status: 'limited' };

    const secret = await firestore.collection(PROJECT_SECRETS_COLLECTION).doc(projectId).get();
    const ok = await verifyPassword(password, secret.get('password') as PasswordHash | undefined);
    if (!ok) return { status: 'wrong' };

    // Plain JSON only (no Timestamps), so it can cross the server action boundary.
    return { status: 'unlocked', content: JSON.parse(JSON.stringify(pickLockedContent(secret.get('content')))) };
  } catch (error) {
    console.error('Unlocking project failed:', error);
    return { status: 'error' };
  }
}
