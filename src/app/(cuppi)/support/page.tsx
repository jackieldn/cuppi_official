import Link from 'next/link';
import type { Metadata } from 'next';
import { ArrowUpRight } from 'lucide-react';
import { CuppiFooter } from '@/components/cuppi/footer';
import { CuppiHeader } from '@/components/cuppi/header';
import { AppTile } from '@/components/cuppi/feature-icon';
import { AppFan } from '@/components/cuppi/home/app-fan';
import { PageHero } from '@/components/cuppi/page-hero';
import { getFanFeatures } from '@/lib/features';
import { PATTERNS } from '@/lib/patterns';
import { SupportMessage } from '@/components/support/support-message';

export const metadata: Metadata = {
  title: 'Support',
  description: 'Get in touch with the Cuppi team, and find out how subscriptions, refunds and your data work.',
  alternates: { canonical: '/support' },
};

// A server component: only the "Message us" pop-up needs the browser, and it lives in SupportMessage.
export default async function SupportPage() {
  const features = await getFanFeatures();

  return (
    <div className="bg-background text-foreground flex flex-col min-h-screen">
      <CuppiHeader />
      <main className="flex-grow">
        <PageHero
          tint="honey"
          align="center"
          title="Support"
          intro="We’re here to help you keep your household running smoothly."
          pattern={{ name: 'springGarden', focus: '50% 50%', shape: 'ellipse' }}
          // Cuppi's icon, with the in-app icons sliding out of it once the page and the pattern have loaded.
          top={<AppFan features={features} when="loaded" waitFor={[PATTERNS.springGarden]} />}
        >
          <div className="flex flex-col items-center gap-4">
            <SupportMessage />
            <p className="max-w-sm text-cuppi-ink-soft">For technical help, feature requests or security questions. We aim to reply within 24–48 hours.</p>
          </div>
        </PageHero>

        <div className="mx-auto w-full max-w-6xl px-3 pb-24 sm:px-6 sm:pb-32">
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <section aria-labelledby="billing" className="rounded-[2rem] border border-cuppi-line bg-cuppi-card p-7 sm:p-9">
              <AppTile feature={{ name: 'Billing', icon: 'star', tile: 'pink' }} className="h-14 w-14" />
              <h2 id="billing" className="mt-5 font-headline text-3xl">
                Subscriptions &amp; billing
              </h2>
              <p className="mt-2 text-cuppi-ink-soft">All Cuppi Pro payments are securely handled by Apple.</p>
              <dl className="mt-6 space-y-5">
                <div>
                  <dt className="font-semibold">To cancel or change a subscription</dt>
                  <dd className="mt-1 text-cuppi-ink-soft">Open the Settings app on your iPhone, tap your name, then tap Subscriptions.</dd>
                </div>
                <div>
                  <dt className="font-semibold">Refunds</dt>
                  <dd className="mt-1 text-cuppi-ink-soft">
                    These must be requested directly through{' '}
                    <a href="https://reportaproblem.apple.com" target="_blank" rel="noopener noreferrer" className="font-medium text-cuppi-brand-deep underline underline-offset-2 hover:no-underline">
                      reportaproblem.apple.com
                    </a>
                    .
                  </dd>
                </div>
              </dl>
            </section>

            <section aria-labelledby="privacy" className="rounded-[2rem] border border-cuppi-line bg-cuppi-card p-7 sm:p-9">
              <AppTile feature={{ name: 'Privacy', icon: 'shield', tile: 'blue' }} className="h-14 w-14" />
              <h2 id="privacy" className="mt-5 font-headline text-3xl">
                Privacy &amp; safety
              </h2>
              <dl className="mt-6 space-y-5">
                <div>
                  <dt className="font-semibold">Account deletion</dt>
                  <dd className="mt-1 text-cuppi-ink-soft">You can delete your account and all associated data via the Profile Settings in the Cuppi app.</dd>
                </div>
                <div>
                  <dt className="font-semibold">Data rights</dt>
                  <dd className="mt-1 text-cuppi-ink-soft">
                    To exercise your right to access or erasure (GDPR), email us with the subject line “Data Request”, or go to your Profile and tap “Request My Data”. A download link will appear within 24 hours, and stays available for 7 days.
                  </dd>
                </div>
              </dl>
            </section>
          </div>

          <Link
            href="/faq"
            className="group mt-4 flex items-center justify-between gap-4 rounded-[2rem] bg-cuppi-sky-soft px-7 py-7 transition-transform duration-500 [transition-timing-function:var(--ease-spring)] hover:-translate-y-1 sm:px-9"
          >
            <span>
              <span className="block font-headline text-2xl sm:text-3xl">Looking for a quick answer?</span>
              <span className="mt-1 block text-cuppi-ink-soft">The help pages cover the most common questions.</span>
            </span>
            <ArrowUpRight className="h-6 w-6 shrink-0 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden />
          </Link>

          <p className="mt-16 border-t border-cuppi-line pt-8 text-center text-sm text-cuppi-ink-soft">
            Cuppi and JackiePoot Creations is a trading name of Jack Ward. ICO Registered: ZC129317
          </p>
        </div>
      </main>
      <CuppiFooter />
    </div>
  );
}
