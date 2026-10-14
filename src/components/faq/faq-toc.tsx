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
    'md:rounded-lg md:border-l-[3px] md:border-transparent md:px-3 md:py-2 md:text-foreground/80 md:hover:bg-muted',
    'md:aria-[current=location]:border-primary md:aria-[current=location]:bg-secondary md:aria-[current=location]:font-semibold md:aria-[current=location]:text-primary',
    'max-md:shrink-0 max-md:whitespace-nowrap max-md:rounded-full max-md:border max-md:border-border max-md:bg-card max-md:px-3.5 max-md:py-1.5',
    'max-md:aria-[current=location]:border-primary max-md:aria-[current=location]:font-semibold max-md:aria-[current=location]:text-primary',
  ].join(' ');

  return (
    <nav
      aria-label="On this page"
      data-faq-toc
      className="max-md:sticky max-md:top-0 max-md:z-10 max-md:-mx-4 max-md:flex max-md:gap-2 max-md:overflow-x-auto max-md:border-b max-md:border-secondary max-md:bg-background max-md:px-4 max-md:py-2 md:sticky md:top-4 md:max-h-[calc(100vh-2rem)] md:overflow-y-auto"
    >
      <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground max-md:hidden">
        {hasTopics ? 'On this page' : 'Questions'}
      </p>
      <ul className="max-md:contents md:grid md:gap-0.5">
        {hasTopics
          ? section.topics.map((topic) => (
              <li key={topic.id} className="max-md:contents">
                <a href={`#${topic.id}`} className={link}>
                  <span>{topic.label}</span>
                  <span className="text-xs tabular-nums text-muted-foreground">{topic.entries.length}</span>
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
