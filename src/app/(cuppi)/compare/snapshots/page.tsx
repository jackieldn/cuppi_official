import type { Metadata } from 'next';
import { CuppiFooter } from '@/components/cuppi/footer';
import { CuppiHeader } from '@/components/cuppi/header';
import { PageHero } from '@/components/cuppi/page-hero';
import { SnapshotsView } from '@/components/cuppi/compare/snapshots-view';
import { getCompare } from '@/lib/compare';
import { JsonLd } from '@/components/faq/json-ld';
import { buildComparePageJsonLd } from '@/lib/page-jsonld';

export const revalidate = 60;

const TITLE = 'Snapshots: Cuppi vs Hartley and FamilyWall';
const DESCRIPTION = 'The screenshots behind the Cuppi comparison: what each app showed us, with its version, phone and date.';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/compare/snapshots' },
  // Kept out of search with the comparison page. Remove this line to publish.
  robots: { index: false, follow: false },
};

export default async function SnapshotsPage() {
  const content = await getCompare();

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <JsonLd
        data={buildComparePageJsonLd('https://cuppi.co.uk', {
          path: '/compare/snapshots',
          name: TITLE,
          description: DESCRIPTION,
          checkedOn: content.checkedOn,
          parent: { name: 'Cuppi vs Hartley and FamilyWall', path: '/compare' },
        })}
      />
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
