import Link from 'next/link';
import { format } from 'date-fns';
import { entryPath, sectionPath, type FaqSection } from '@/lib/faq-model';

/** A topic on the FAQ home page: its name, what it covers, and its first few questions. */
export function FaqSectionCard({ section }: { section: FaqSection }) {
  const count = section.entries.length;
  return (
    <article className="flex min-w-0 flex-col gap-2.5 rounded-2xl border bg-card p-5 transition-colors hover:border-primary sm:p-6">
      <h3 className="font-headline text-xl font-bold leading-tight sm:text-2xl">
        <Link href={sectionPath(section.id)} className="hover:text-primary">
          {section.label}
        </Link>
      </h3>
      {section.blurb && <p className="text-sm text-muted-foreground sm:text-base">{section.blurb}</p>}
      <ul className="mt-1 grid">
        {section.entries.slice(0, 3).map((entry) => (
          <li key={entry.id} className="border-t border-secondary">
            <Link href={entryPath(entry)} className="block py-1.5 text-sm text-foreground/80 hover:text-primary sm:text-base">
              {entry.question}
            </Link>
          </li>
        ))}
      </ul>
      <p className="mt-auto pt-2 text-xs tabular-nums text-muted-foreground">
        {count} {count === 1 ? 'answer' : 'answers'}
        {section.updatedAt ? ` · Updated ${format(new Date(section.updatedAt), 'd MMM yyyy')}` : ''}
      </p>
    </article>
  );
}
