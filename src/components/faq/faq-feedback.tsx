'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { ThumbsDown, ThumbsUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { submitFaqFeedback } from '@/app/actions/faq-feedback';

// Google's script is only fetched if a visitor is asked to prove they are human.
const ReCaptcha = dynamic(() => import('react-google-recaptcha'), { ssr: false });

const STORAGE_KEY = 'cuppi-faq-feedback-v1';

// What this browser already voted, so a revisit shows it. Purely a convenience:
// the server decides what counts, and storage may be blocked or empty.
function readChoice(answerId: string): boolean | null {
  try {
    const all = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '{}');
    return typeof all[answerId] === 'boolean' ? all[answerId] : null;
  } catch {
    return null;
  }
}

function writeChoice(answerId: string, helpful: boolean) {
  try {
    const all = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '{}');
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...all, [answerId]: helpful }));
  } catch {
    // Nothing to do: the vote was still sent.
  }
}

type Phase = 'idle' | 'sending' | 'captcha' | 'error';

export function FaqFeedback({ answerId }: { answerId: string }) {
  const [choice, setChoice] = useState<boolean | null>(null);
  const [phase, setPhase] = useState<Phase>('idle');
  const [message, setMessage] = useState('');
  const wanted = useRef<boolean | null>(null);
  const trap = useRef<HTMLInputElement>(null);

  useEffect(() => setChoice(readChoice(answerId)), [answerId]);

  async function send(helpful: boolean, captchaToken?: string) {
    wanted.current = helpful;
    setPhase('sending');
    const result = await submitFaqFeedback({ answerId, helpful, website: trap.current?.value ?? '' }, captchaToken).catch(
      () => ({ status: 'error', message: 'We could not save your feedback. Please try again later.' }) as const,
    );
    if (result.status === 'saved') {
      writeChoice(answerId, result.helpful);
      setChoice(result.helpful);
      setPhase('idle');
    } else if (result.status === 'captcha') {
      setPhase('captcha');
    } else {
      setMessage(result.message);
      setPhase('error');
    }
  }

  const button = (helpful: boolean) => {
    const Icon = helpful ? ThumbsUp : ThumbsDown;
    const selected = choice === helpful;
    return (
      <button
        type="button"
        aria-pressed={selected}
        disabled={phase === 'sending' || phase === 'captcha'}
        onClick={() => void send(helpful)}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-md border bg-card px-2.5 py-1 font-medium transition-colors hover:border-primary hover:text-primary disabled:opacity-60',
          selected && 'border-primary bg-secondary text-primary',
        )}
      >
        <Icon aria-hidden="true" className="h-3.5 w-3.5" />
        {helpful ? 'Yes' : 'No'}
      </button>
    );
  };

  return (
    <div className="mt-4 text-sm text-muted-foreground">
      <div role="group" aria-label="Was this answer helpful?" className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <span>Was this helpful?</span>
        {button(true)}
        {button(false)}
        {/* Honeypot: invisible to people and skipped by keyboards and screen readers. */}
        <input ref={trap} type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 opacity-0" />
      </div>

      <p role="status" aria-live="polite" className="mt-2 min-h-5">
        {phase === 'sending' && 'Saving…'}
        {phase === 'idle' && choice === true && 'Thanks for the feedback.'}
        {phase === 'idle' && choice === false && (
          <>
            Sorry it didn’t help.{' '}
            <Link href="/support" className="font-medium text-primary underline hover:no-underline">
              Contact support
            </Link>
          </>
        )}
        {phase === 'error' && message}
      </p>

      {phase === 'captcha' && (
        <div className="mt-2">
          <p className="mb-2">Please confirm you are human to send your feedback.</p>
          <ReCaptcha
            sitekey={process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY!}
            onChange={(token) => {
              if (token && wanted.current !== null) void send(wanted.current, token);
            }}
          />
        </div>
      )}
    </div>
  );
}
