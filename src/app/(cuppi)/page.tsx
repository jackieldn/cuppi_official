import { CuppiFooter } from '@/components/cuppi/footer';
import { CuppiHeader } from '@/components/cuppi/header';
import { HomeHero } from '@/components/cuppi/home/hero';
import { WhatsNew } from '@/components/cuppi/whats-new';
import { homeHero } from '@/lib/home-hero';

// "What's new" re-checks the latest Cosy Corner posts every minute. The hero is
// set in src/lib/home-hero.ts; everything else that used to live on this page
// now has its own page under /features.
export const revalidate = 60;

export default function CuppiPage() {
  return (
    <div className="bg-background text-foreground flex flex-col min-h-screen">
      <CuppiHeader />
      <main className="flex-grow w-full flex flex-col items-center">
        <HomeHero hero={homeHero} />

        {/* One line on what Cuppi is, for anyone arriving without knowing. */}
        <section className="mx-auto max-w-3xl px-6 pb-4 pt-20 text-center">
          <p className="font-headline text-4xl leading-tight tracking-tight text-balance sm:text-5xl">
            Reminders that care as much <em className="text-cuppi-brand">as you do.</em>
          </p>
          <p className="mx-auto mt-5 max-w-xl text-lg text-cuppi-ink-soft">
            Cuppi is your calm and private household app where you save information once and get reminded gently forever.
          </p>
        </section>

        <WhatsNew />
        <div className="py-16" />
      </main>
      <CuppiFooter />
    </div>
  );
}
