import type { FaqSection } from '@/lib/faq-model';

/**
 * "On this page" navigation. A sticky column beside the answers on wide
 * screens, a scrolling row of chips under the heading on phones. Plain anchor
 * links, so it works without JavaScript.
 */
export function FaqToc({ section }: { section: FaqSection }) {
  const hasTopics = section.topics.length > 0;
  // Desktop and phone styles are separate sets, so they never compete.
  const link = [
    'flex items-center justify-between gap-3 text-sm transition-colors',
    'md:rounded-2xl md:px-4 md:py-2.5 md:text-cuppi-ink-soft md:hover:bg-cuppi-honey-soft/60 md:hover:text-cuppi-ink',
    'md:aria-[current=location]:bg-cuppi-honey-soft md:aria-[current=location]:font-semibold md:aria-[current=location]:text-cuppi-ink',
    'max-md:shrink-0 max-md:whitespace-nowrap max-md:rounded-full max-md:border max-md:border-cuppi-line max-md:bg-cuppi-card max-md:px-4 max-md:py-1.5',
    'max-md:aria-[current=location]:border-cuppi-honey max-md:aria-[current=location]:bg-cuppi-honey-soft max-md:aria-[current=location]:font-semibold',
  ].join(' ');

  return (
    <nav
      aria-label="On this page"
      data-faq-toc
      className="max-md:sticky max-md:top-20 max-md:z-10 max-md:-mx-4 max-md:flex max-md:gap-2 max-md:overflow-x-auto max-md:border-b max-md:border-cuppi-line max-md:bg-background max-md:px-4 max-md:py-2 md:sticky md:top-24 md:max-h-[calc(100vh-8rem)] md:overflow-y-auto"
    >
      <p className="mb-2 px-4 text-xs font-semibold uppercase tracking-[0.14em] text-cuppi-ink-soft max-md:hidden">
        {hasTopics ? 'On this page' : 'Questions'}
      </p>
      <ul className="max-md:contents md:grid md:gap-0.5">
        {hasTopics
          ? section.topics.map((topic) => (
              <li key={topic.id} className="max-md:contents">
                <a href={`#${topic.id}`} className={link}>
                  <span>{topic.label}</span>
                  <span className="text-xs tabular-nums text-cuppi-ink-soft">{topic.entries.length}</span>
                </a>
              </li>
            ))
          : section.entries.map((entry) => (
              <li key={entry.id} className="max-md:contents">
                <a href={`#${entry.slug}`} className={link}>
                  {entry.question}
                </a>
              </li>
            ))}
      </ul>
    </nav>
  );
}
