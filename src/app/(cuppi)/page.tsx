import { CuppiFooter } from '@/components/cuppi/footer';
import { CuppiHeader } from '@/components/cuppi/header';
import { HomeHero } from '@/components/cuppi/home/hero';
import { WhatsNew } from '@/components/cuppi/whats-new';
import { AppFan } from '@/components/cuppi/home/app-fan';
import { getFanFeatures } from '@/lib/features';
import { buildHero } from '@/lib/home-hero-settings';
import { getHeroSettings } from '@/lib/cuppi-site-data';
import { refreshMetadata, refreshPage } from '@/components/cuppi/section-gate';

// "What's new" re-checks the latest Cosy Corner posts every minute. The hero is
// set in the admin (Cuppi home), with src/lib/home-hero.ts as its starting point and its
// screenshot; everything else that used to live on this page
// now has its own page under /features.
export const revalidate = 60;

export const generateMetadata = () => refreshMetadata('home');

export default async function CuppiPage() {
  // The home page can be switched to "refresh in progress" in the admin (Cuppi pages).
  const holding = await refreshPage('home');
  if (holding) return holding;

  // The icons that slide out of Cuppi: chosen and ordered in the admin (Cuppi > Icon banner).
  const features = await getFanFeatures();
  const hero = buildHero(await getHeroSettings());

  return (
    <div className="bg-background text-foreground flex flex-col min-h-screen">
      <CuppiHeader />
      <main className="flex-grow w-full flex flex-col items-center">
        <HomeHero hero={hero} />

        <WhatsNew />

        {/* One line on what Cuppi is. Cuppi's icon sits alone until it scrolls into view, then the in-app icons slide out of it. */}
        <section className="mx-auto w-full max-w-5xl px-6 pb-4 pt-24 text-center">
          <AppFan features={features} />
          <p className="mx-auto mt-12 max-w-3xl font-headline text-4xl leading-tight tracking-tight text-balance sm:text-5xl">
            Reminders that care as much <em className="text-cuppi-brand">as you do.</em>
          </p>
          <p className="mx-auto mt-5 max-w-xl text-lg text-cuppi-ink-soft">
            Cuppi is your calm and private household app where you save information once and get reminded gently forever.
          </p>
        </section>

        <div className="py-16" />
      </main>
      <CuppiFooter />
    </div>
  );
}
