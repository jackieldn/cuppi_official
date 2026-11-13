import Link from 'next/link';
import { CuppiFooter } from '@/components/cuppi/footer';
import { CuppiHeader } from '@/components/cuppi/header';
import { CuppiTile } from '@/components/cuppi/feature-icon';
import { PageHero } from '@/components/cuppi/page-hero';
import { SECTIONS, type PageStatus, type SectionKey } from '@/lib/page-status';

/**
 * What a visitor sees in place of a section while it is being updated: the usual menu and
 * footer, and a calm note with links to the parts of the site that are live. The admin
 * switches a section into this state (Cuppi pages), so a half-finished page is never shown.
 */
export function RefreshInProgress({ section, status }: { section: SectionKey; status: PageStatus }) {
  const current = SECTIONS.find((s) => s.key === section)!;
  const elsewhere = SECTIONS.filter((s) => s.key !== section && status[s.key] === 'live');
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <CuppiHeader />
      <main className="flex-grow">
        <PageHero
          tint="honey"
          align="center"
          title="A little refresh is under way"
          intro={`We’re updating ${current.phrase} and it will be back soon. Thank you for your patience.`}
          pattern={{ name: 'springGarden', focus: '50% 50%', shape: 'ellipse' }}
          top={
            <CuppiTile className="mx-auto h-24 w-24" priority />
          }
        >
          {elsewhere.length > 0 && (
            <div className="flex flex-col items-center gap-3">
              <p className="text-cuppi-ink-soft">In the meantime, you can visit</p>
              <ul className="flex flex-wrap justify-center gap-2">
                {elsewhere.map((s) => (
                  <li key={s.key}>
                    <Link href={s.path} className="inline-flex rounded-full bg-cuppi-paper/90 px-5 py-2.5 font-medium text-cuppi-ink transition-colors hover:bg-cuppi-paper">
                      {s.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </PageHero>
      </main>
      <CuppiFooter />
    </div>
  );
}
