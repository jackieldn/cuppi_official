'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';

const SLIDE_MS = 320;
const SLIDE_EASE = 'cubic-bezier(0.22, 1, 0.36, 1)';

/**
 * One question of an FAQs section: a native <details> whose answer slides open and shut.
 *
 * It stays a real <details>, so the whole answer is in the page's HTML (search engines, no-JavaScript visitors and
 * Ctrl+F all see it, and without JavaScript it simply opens without the slide). The slide is the Web Animations API on
 * the answer's height: opening sets `open` first so the answer can be measured, closing clears it only once the slide
 * has finished. Clicking again mid-slide turns it round from where it is. Visitors who ask for reduced motion get the
 * plain open and close.
 */
export function FaqItem({ question, children }: { question: string; children: ReactNode }) {
  const details = useRef<HTMLDetailsElement>(null);
  const body = useRef<HTMLDivElement>(null);
  const slide = useRef<Animation | null>(null);
  // What the chevron shows. It flips the moment you click, not when the slide ends, so it moves with the answer.
  const [expanded, setExpanded] = useState(false);
  const expandedNow = useRef(false);

  const set = (open: boolean) => {
    expandedNow.current = open;
    setExpanded(open);
  };

  // Leaving the page mid-slide must not leave an animation running.
  useEffect(() => () => slide.current?.cancel(), []);

  const toggle = (e: React.MouseEvent) => {
    const el = details.current;
    const answer = body.current;
    if (!el || !answer) return;
    e.preventDefault();
    const open = !expandedNow.current;
    set(open);

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      slide.current?.cancel();
      el.open = open;
      return;
    }

    // Where the answer is right now, read before the old slide is dropped: partway if a slide is under way. A shut
    // <details> still lays its answer out at full height (browsers only hide it), so shut has to be read as 0.
    const from = el.open ? answer.getBoundingClientRect().height : 0;
    slide.current?.cancel();
    if (open) el.open = true;
    const to = open ? answer.scrollHeight : 0;

    const run = answer.animate(
      { height: [`${from}px`, `${to}px`], opacity: [from === 0 ? 0 : 1, open ? 1 : 0] },
      { duration: SLIDE_MS, easing: SLIDE_EASE, fill: 'forwards' },
    );
    slide.current = run;
    run.onfinish = () => {
      if (slide.current !== run) return;
      slide.current = null;
      if (!open) el.open = false;
      run.cancel();
    };
  };

  return (
    <details
      ref={details}
      className="group/faq border-b border-cuppi-line last:border-b-0"
      onToggle={(e) => {
        // Opened or shut from outside (a find-in-page match, a link to the answer): keep the chevron in step. Skipped
        // while a slide of ours is under way, which has already set it.
        if (!slide.current) set(e.currentTarget.open);
      }}
    >
      <summary
        onClick={toggle}
        className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-cuppi-honey-soft/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-cuppi-brand sm:px-6 [&::-webkit-details-marker]:hidden"
      >
        <h3 className="text-base font-semibold leading-snug sm:text-lg">{question}</h3>
        <ChevronDown aria-hidden className={`h-5 w-5 shrink-0 text-cuppi-ink-soft transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`} />
      </summary>
      <div ref={body} className="overflow-hidden">
        <div className="px-5 pb-5 sm:px-6">{children}</div>
      </div>
    </details>
  );
}
