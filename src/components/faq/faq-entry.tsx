import { format } from 'date-fns';
import { ChevronDown, Link2 } from 'lucide-react';
import { FaqFeedback } from '@/components/faq/faq-feedback';
import { PortableText } from '@/components/portable-text';
import type { FaqEntry } from '@/lib/faq-model';

/**
 * One question and its answer. A native <details>: the full answer is always in
 * the HTML (crawlers, no-JavaScript visitors and Ctrl+F all see it) and the
 * browser handles opening and closing. The id is the permalink anchor.
 */
export function FaqEntryItem({ entry }: { entry: FaqEntry }) {
  return (
    <details id={entry.slug} data-faq-entry className="group/entry scroll-mt-4 border-b border-secondary">
      <summary className="group/summary grid cursor-pointer list-none grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 rounded-lg px-1 py-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
        <h3 className="col-start-1 text-base font-semibold leading-snug group-hover/summary:text-primary sm:text-lg">{entry.question}</h3>
        {entry.preview && (
          <span className="col-start-1 block truncate text-sm text-muted-foreground group-open/entry:hidden">{entry.preview}</span>
        )}
        <ChevronDown
          aria-hidden="true"
          className="col-start-2 row-span-2 row-start-1 h-5 w-5 shrink-0 text-muted-foreground transition-transform group-open/entry:rotate-180"
        />
      </summary>

      <div className="px-1 pb-5">
        <div className="max-w-prose text-base leading-relaxed">
          <PortableText value={entry.answer} variant="answer" />
        </div>
        <FaqFeedback answerId={entry.id} />
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
          <a
            href={`#${entry.slug}`}
            data-faq-permalink
            className="group/link inline-flex items-center gap-1.5 rounded-md border bg-card px-2.5 py-1 font-medium hover:border-primary hover:text-primary"
          >
            <Link2 aria-hidden="true" className="h-3.5 w-3.5" />
            <span className="group-data-[copied=true]/link:hidden">Copy link</span>
            <span className="hidden group-data-[copied=true]/link:inline" role="status">
              Copied
            </span>
          </a>
          {entry.updatedAt && <span>Updated {format(new Date(entry.updatedAt), 'd MMM yyyy')}</span>}
        </div>
      </div>
    </details>
  );
}
