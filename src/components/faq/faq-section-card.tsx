import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { AppTile } from '@/components/cuppi/feature-icon';
import type { FaqTile } from '@/lib/faq-visuals';
import { sectionPath, type FaqSection } from '@/lib/faq-model';

/** A help topic on the help page: its tile, its name and one line. The questions are one click away. */
export function FaqSectionCard({ section, tile }: { section: FaqSection; tile: FaqTile }) {
  return (
    <Link
      href={sectionPath(section.id)}
      className="group flex items-center gap-5 rounded-[2rem] border border-cuppi-line bg-cuppi-card p-5 transition-transform duration-500 [transition-timing-function:var(--ease-spring)] hover:-translate-y-1 sm:p-6"
    >
      <AppTile feature={{ ...tile, name: section.label }} className="h-16 w-16" />
      <div className="min-w-0 flex-1">
        <h3 className="font-headline text-2xl leading-tight">{section.label}</h3>
        {section.blurb && <p className="mt-1 line-clamp-2 text-cuppi-ink-soft">{section.blurb}</p>}
      </div>
      <ArrowUpRight
        aria-hidden="true"
        className="h-5 w-5 shrink-0 text-cuppi-ink-soft transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-cuppi-brand-deep"
      />
    </Link>
  );
}
