import type { Metadata } from 'next';
import { CuppiFooter } from '@/components/cuppi/footer';
import { CuppiHeader } from '@/components/cuppi/header';
import { PageHero } from '@/components/cuppi/page-hero';
import { SnapshotsView } from '@/components/cuppi/compare/snapshots-view';
import { getCompare } from '@/lib/compare';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'Snapshots: Cuppi vs Hartley and FamilyWall',
  description: 'The screenshots behind the Cuppi comparison: what each app showed us, with its version, phone and date.',
  alternates: { canonical: '/compare/snapshots' },
  // Kept out of search with the comparison page. Remove this line to publish.
  robots: { index: false, follow: false },
};

export default async function SnapshotsPage() {
  const content = await getCompare();

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <CuppiHeader />
      <main className="flex-grow">
        <PageHero
          tint="sky"
          align="center"
          title="Snapshots"
          intro={content.snapshotsIntro}
          back={{ href: '/compare', label: 'The comparison' }}
          pattern={{ name: 'springGarden', focus: '50% 50%', shape: 'ellipse' }}
        />
        <SnapshotsView content={content} />
      </main>
      <CuppiFooter />
    </div>
  );
}
