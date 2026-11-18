import type { Metadata } from 'next';
import { CuppiFooter } from '@/components/cuppi/footer';
import { CuppiHeader } from '@/components/cuppi/header';
import { DownloadStrip } from '@/components/cuppi/blocks/download-strip';
import { PageHero } from '@/components/cuppi/page-hero';
import { PlansView } from '@/components/cuppi/plans/plans-view';
import { getFeatures, getPlans } from '@/lib/features';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'Plans',
  description: 'What Cuppi Free and Cuppi Pro each include, feature by feature, and what Pro costs.',
  alternates: { canonical: '/plans' },
};

export default async function PlansPage() {
  const [settings, features] = await Promise.all([getPlans(), getFeatures()]);

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <CuppiHeader />
      <main className="flex-grow">
        <PageHero
          tint="honey"
          align="center"
          title="Plans"
          intro="Start with Cuppi Free and move to Pro whenever your home needs more room. Here is what each one includes, feature by feature."
          pattern={{ name: 'springGarden', focus: '50% 50%', shape: 'ellipse' }}
        />
        <PlansView settings={settings} features={features} />
        <div className="pt-6">
          <DownloadStrip />
        </div>
      </main>
      <CuppiFooter />
    </div>
  );
}
