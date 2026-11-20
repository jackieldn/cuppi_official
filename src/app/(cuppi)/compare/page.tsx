import type { Metadata } from 'next';
import { CuppiFooter } from '@/components/cuppi/footer';
import { CuppiHeader } from '@/components/cuppi/header';
import { DownloadStrip } from '@/components/cuppi/blocks/download-strip';
import { PageHero } from '@/components/cuppi/page-hero';
import { CompareView } from '@/components/cuppi/compare/compare-view';
import { dateLabel } from '@/lib/compare-data';
import { getCompare } from '@/lib/compare';
import { getPlans } from '@/lib/features';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'Cuppi vs Hartley and FamilyWall',
  description: 'Three home apps, one job: make household life easier. How Cuppi’s features, tracking and price compare with Hartley and FamilyWall.',
  alternates: { canonical: '/compare' },
  // Kept out of search until every cell has been checked in the app and the sources are final. Remove this line to publish.
  robots: { index: false, follow: false },
};

export default async function ComparePage() {
  const [{ prices }, content] = await Promise.all([getPlans(), getCompare()]);

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <CuppiHeader />
      <main className="flex-grow">
        <PageHero
          tint="honey"
          align="center"
          title={
            <>
              Cuppi Home <span className="my-1 block font-body text-2xl font-medium tracking-normal text-cuppi-ink-soft sm:my-2 sm:text-3xl">vs</span> Hartley <span className="text-2xl sm:text-3xl">and</span> FamilyWall
            </>
          }
          intro="Three home apps, one job: make household life easier. Here is how Cuppi’s features compare."
          pattern={{ name: 'springGarden', focus: '50% 50%', shape: 'ellipse' }}
          top={
            <span className="inline-block rounded-full bg-cuppi-honey px-3.5 py-1 text-sm font-semibold text-cuppi-espresso">Checked {dateLabel(content.checkedOn)}</span>
          }
        >
          <nav aria-label="On this page" className="flex flex-wrap justify-center gap-2">
            {[
              ['#features', 'Features'],
              ['#data', 'Privacy'],
              ['#price', 'Price'],
              ['#sources', 'Sources'],
            ].map(([href, label]) => (
              <a key={href} href={href} className="rounded-full border border-cuppi-line bg-cuppi-card px-4 py-1.5 text-sm font-medium transition-colors hover:bg-cuppi-paper-deep">
                {label}
              </a>
            ))}
          </nav>
        </PageHero>
        <CompareView content={content} prices={prices} />
        <div className="pt-6">
          <DownloadStrip />
        </div>
      </main>
      <CuppiFooter />
    </div>
  );
}
