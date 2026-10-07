import { CuppiFooter } from '@/components/cuppi/footer';
import { CuppiHeader } from '@/components/cuppi/header';
import { HomeHero } from '@/components/cuppi/home/hero';
import { HomeNav } from '@/components/cuppi/home/nav';
import { HomeCarouselSection } from '@/components/cuppi/home/carousel-section';
import { HomeImageSection } from '@/components/cuppi/home/image-section';
import { WhatsNew } from '@/components/cuppi/whats-new';
import { getHomePage } from '@/lib/home-page';

// The page content is edited in Sanity ("Home page"). Re-check it every minute.
export const revalidate = 60;

export default async function CuppiPage() {
  const home = await getHomePage();

  return (
    <div className="bg-background text-foreground flex flex-col min-h-screen">
      <CuppiHeader />
      <main className="flex-grow w-full flex flex-col items-center p-4">
        <HomeHero hero={home.hero} />
        <HomeNav sections={home.sections} />
        <WhatsNew />
        {home.sections.map((section) =>
          section.kind === 'carousel' ? (
            <HomeCarouselSection key={section.id} section={section} />
          ) : (
            <HomeImageSection key={section.id} section={section} />
          ),
        )}
        <div className="py-16" />
      </main>
      <CuppiFooter />
    </div>
  );
}
