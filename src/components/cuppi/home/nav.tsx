import Link from 'next/link';
import type { HomeSection } from '@/lib/home-page-types';

const chipClass =
  "px-4 py-1.5 border rounded-full text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground hover:border-accent";

// One chip per section, in page order. The "What's New" posts sit between the
// first and second sections, so its chip goes there too.
export function HomeNav({ sections }: { sections: HomeSection[] }) {
  const [first, ...rest] = sections;
  return (
    <nav className="my-6 flex flex-wrap justify-center gap-3">
      {first && (
        <Link href={`#${first.id}`} className={chipClass}>
          {first.eyebrow}
        </Link>
      )}
      <Link href="#whats-new" className={chipClass}>
        What's New
      </Link>
      {rest.map((section) => (
        <Link key={section.id} href={`#${section.id}`} className={chipClass}>
          {section.eyebrow}
        </Link>
      ))}
    </nav>
  );
}
