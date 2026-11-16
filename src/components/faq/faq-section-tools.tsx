'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

// Everything here is progressive enhancement. The page is complete without it:
// every answer is in the HTML inside a native <details>, and every anchor is a
// plain link. This adds: opening the answer a link points to, "Expand all",
// copying an answer's link, and highlighting the current sub-topic.

function openFromHash() {
  const id = decodeURIComponent(window.location.hash.slice(1));
  const target = id ? document.getElementById(id) : null;
  if (!target) return;
  const details = target.closest('details');
  if (details) {
    details.open = true;
    details.classList.remove('faq-flash');
    void details.offsetWidth; // restart the animation if it is already running
    details.classList.add('faq-flash');
  }
  target.scrollIntoView({ block: 'start' });
}

const ANIMATIONS = new WeakMap<HTMLDetailsElement, Animation>();

/**
 * Opens or closes an answer with a slide, which a native <details> does not do (it jumps). Opening sets `open` first so the answer
 * is in the page, then grows it from nothing; closing shrinks it, and only then sets `open` off. Clicking again part-way reverses
 * from wherever it has got to. The summary's chevron is turned back at once when closing, rather than after the slide.
 */
function toggleAnimated(details: HTMLDetailsElement) {
  const body = details.querySelector<HTMLElement>(':scope > div');
  if (!body) {
    details.open = !details.open;
    return;
  }
  const chevron = details.querySelector<SVGElement>(':scope > summary svg');
  const opening = !details.open || details.dataset.closing === 'true';
  const from = ANIMATIONS.get(details) ? body.getBoundingClientRect().height : opening ? 0 : body.scrollHeight;
  ANIMATIONS.get(details)?.cancel();

  details.open = true;
  details.dataset.closing = opening ? 'false' : 'true';
  chevron?.style.setProperty('transform', opening ? '' : 'rotate(0deg)');
  const to = opening ? body.scrollHeight : 0;
  body.style.overflow = 'hidden';

  const animation = body.animate([{ height: `${from}px`, opacity: from === 0 ? 0 : 1 }, { height: `${to}px`, opacity: opening ? 1 : 0 }], {
    duration: 280,
    easing: 'cubic-bezier(0.22, 0.8, 0.3, 1)',
  });
  ANIMATIONS.set(details, animation);
  animation.onfinish = () => {
    ANIMATIONS.delete(details);
    body.style.overflow = '';
    delete details.dataset.closing;
    chevron?.style.removeProperty('transform');
    if (!opening) details.open = false;
  };
  // A cancelled slide (a newer click took over) leaves the newer one to tidy up.
}

export function FaqSectionEnhancer() {
  useEffect(() => {
    // Answers slide open and shut. Not with reduced motion, and not on the keyboard/click default we cannot replace: the
    // summary's own toggle is cancelled and done here, so Enter and Space (which fire a click on a summary) work the same.
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onSummaryClick = (event: MouseEvent) => {
      if (reduced.matches || !('animate' in HTMLElement.prototype)) return;
      const summary = (event.target as Element | null)?.closest<HTMLElement>('details[data-faq-entry] > summary');
      if (!summary) return;
      event.preventDefault();
      toggleAnimated(summary.parentElement as HTMLDetailsElement);
    };
    document.addEventListener('click', onSummaryClick);

    // After the first paint, so Next's own scroll-to-hash has already run.
    const first = requestAnimationFrame(openFromHash);
    // Links to answers on this page arrive as hash changes. (router.push of a
    // hash does not fire hashchange; the search box handles that case itself.)
    window.addEventListener('hashchange', openFromHash);
    window.addEventListener('popstate', openFromHash);

    const onClick = (event: MouseEvent) => {
      const link = (event.target as Element | null)?.closest<HTMLAnchorElement>('a[data-faq-permalink]');
      if (!link) return;
      const url = new URL(link.getAttribute('href') ?? '', window.location.href).toString();
      navigator.clipboard
        ?.writeText(url)
        .then(() => {
          link.dataset.copied = 'true';
          window.setTimeout(() => delete link.dataset.copied, 1800);
        })
        .catch(() => {}); // the link still works as a normal anchor
    };
    document.addEventListener('click', onClick);

    // Mark the sub-topic being read in the side navigation.
    const topics = Array.from(document.querySelectorAll<HTMLElement>('[data-faq-topic]'));
    const links = new Map(
      Array.from(document.querySelectorAll<HTMLAnchorElement>('[data-faq-toc] a[href^="#"]')).map((a) => [a.getAttribute('href')!.slice(1), a]),
    );
    let observer: IntersectionObserver | undefined;
    if (topics.length && links.size && 'IntersectionObserver' in window) {
      observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (!entry.isIntersecting) continue;
            links.forEach((a, id) => (id === entry.target.id ? a.setAttribute('aria-current', 'location') : a.removeAttribute('aria-current')));
          }
        },
        { rootMargin: '-15% 0px -75% 0px' },
      );
      topics.forEach((t) => observer!.observe(t));
    }

    return () => {
      cancelAnimationFrame(first);
      window.removeEventListener('hashchange', openFromHash);
      window.removeEventListener('popstate', openFromHash);
      document.removeEventListener('click', onClick);
      document.removeEventListener('click', onSummaryClick);
      observer?.disconnect();
    };
  }, []);

  return null;
}

export function ExpandAllButton({ className }: { className?: string }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <button
      type="button"
      aria-pressed={expanded}
      onClick={() => {
        const next = !expanded;
        document.querySelectorAll<HTMLDetailsElement>('details[data-faq-entry]').forEach((d) => {
          d.open = next;
        });
        setExpanded(next);
      }}
      className={cn(
        'inline-flex min-h-12 items-center rounded-full border border-cuppi-line bg-cuppi-card px-5 text-sm font-semibold transition-colors hover:bg-cuppi-honey-soft',
        className,
      )}
    >
      {expanded ? 'Collapse all' : 'Expand all'}
    </button>
  );
}
