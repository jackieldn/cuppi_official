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

export function FaqSectionEnhancer() {
  useEffect(() => {
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
        'inline-flex items-center rounded-lg border bg-card px-3.5 py-2 text-sm font-semibold transition-colors hover:border-primary hover:text-primary',
        className,
      )}
    >
      {expanded ? 'Collapse all' : 'Expand all'}
    </button>
  );
}
