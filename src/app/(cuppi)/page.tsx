import { CuppiFooter } from '@/components/cuppi/footer';
import { CuppiHeader } from '@/components/cuppi/header';
import { HomeHero } from '@/components/cuppi/home/hero';
import { HeroCarousel } from '@/components/cuppi/home/hero-carousel';
import { WhatsNew } from '@/components/cuppi/whats-new';
import { LatestVideo } from '@/components/cuppi/home/latest-video';
import { AppFan } from '@/components/cuppi/home/app-fan';
import { ComparePromo } from '@/components/cuppi/plans/compare-promo';
import { Reveal } from '@/components/ui/reveal';
import { getFanFeatures } from '@/lib/features';
import { HERO_HOLD_SECONDS, buildHero } from '@/lib/home-hero-settings';
import { getHeroHeight, getHeroList } from '@/lib/cuppi-site-data';
import { refreshMetadata, refreshPage } from '@/components/cuppi/section-gate';
import { JsonLd } from '@/components/faq/json-ld';
import { buildHomeJsonLd } from '@/lib/page-jsonld';
import type { Metadata } from 'next';

// "What's new" re-checks the latest Cosy Corner posts every minute. The heroes (one to five, a
// slideshow when there are several) are set in the admin (Cuppi home), with src/lib/home-hero.ts as
// the starting point and the original screenshot; everything else that used to live on this page
// now has its own page under /features.
export const revalidate = 60;

export const generateMetadata = async (): Promise<Metadata> => ({ alternates: { canonical: '/' }, ...(await refreshMetadata('home')) });

export default async function CuppiPage() {
  // The home page can be switched to "refresh in progress" in the admin (Cuppi pages).
  const holding = await refreshPage('home');
  if (holding) return holding;

  // The icons that slide out of Cuppi: chosen and ordered in the admin (Cuppi > Icon banner).
  const features = await getFanFeatures();
  const [heroList, heroHeight] = await Promise.all([getHeroList(), getHeroHeight()]);
  const heroes = heroList.map((h) => buildHero(h, heroHeight));

  return (
    <div className="bg-background text-foreground flex flex-col min-h-screen">
      <JsonLd data={buildHomeJsonLd('https://cuppi.co.uk')} />
      <CuppiHeader />
      <main className="flex-grow w-full flex flex-col items-center">
        {/* The slides below are promos that change, so the page's own heading says what Cuppi is, for screen readers and crawlers. */}
        <h1 className="sr-only">Cuppi Home: the calm, private household app for the UK</h1>
        {heroes.length > 1 ? (
          <HeroCarousel tints={heroes.map((h) => h.tint)} holdSeconds={HERO_HOLD_SECONDS}>
            {heroes.map((hero, i) => (
              <HomeHero key={i} hero={hero} fill />
            ))}
          </HeroCarousel>
        ) : (
          <HomeHero hero={heroes[0]} />
        )}

        <WhatsNew />

        {/* The latest advert, when there is one (Cuppi > Home video in the admin). */}
        <LatestVideo />

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

        {/* An invitation to the comparison page, as on the Plans page. */}
        <Reveal className="mx-auto w-full max-w-4xl px-3 pb-20 pt-12 sm:px-6">
          <ComparePromo />
        </Reveal>
      </main>
      <CuppiFooter />
    </div>
  );
}
