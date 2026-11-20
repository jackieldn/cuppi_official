import { PhoneMockup } from '@/components/cuppi/blocks/phone-mockup';
import { ActionButton } from '@/components/cuppi/action-button';

/**
 * A boxed invitation on the Plans page: "See why Cuppi Home is the right choice", with the top of the app in an iPhone on the left (the
 * phone is cut off, fading out at the bottom of the box) and a Compare button on the right. The box is a plain card like the Free plan's;
 * the button is the site's main action, in orange liquid glass (a flat fill, a deeper outline and a thin shine curving into the ends).
 */
export function ComparePromo() {
  return (
    <section aria-labelledby="compare-promo-title" className="relative overflow-hidden rounded-[2rem] border border-cuppi-line bg-cuppi-card">
      <div className="grid items-center md:min-h-[17.5rem] md:grid-cols-[15rem_minmax(0,1fr)]">
        {/* The top of the app, in its phone. The column cuts the phone off and fades it out at the bottom. */}
        <div
          aria-hidden
          className="relative h-60 overflow-hidden md:h-full"
          style={{ maskImage: 'linear-gradient(to bottom, #000 58%, transparent 100%)', WebkitMaskImage: 'linear-gradient(to bottom, #000 58%, transparent 100%)' }}
        >
          <PhoneMockup
            kind="front"
            src="/images/cuppi-augustine-home-v1.webp"
            alt=""
            imageWidth={1170}
            imageHeight={2532}
            bg="#FBF4E6"
            sizes="(max-width: 768px) 60vw, 240px"
            className="absolute left-1/2 top-7 w-[12.5rem] -translate-x-1/2"
          />
        </div>

        <div className="px-6 pb-8 pt-2 text-center md:py-10 md:pl-4 md:pr-10 md:text-left">
          <h2 id="compare-promo-title" className="font-headline text-3xl font-normal leading-tight tracking-tight sm:text-4xl">
            See why Cuppi Home is the right choice
          </h2>
          <p className="mt-3 max-w-xl text-lg leading-snug text-cuppi-ink-soft md:max-w-lg">We compared our app with available ones in the UK.</p>
          <ActionButton href="/compare" size="lg" className="mt-6">
            Compare
          </ActionButton>
        </div>
      </div>
    </section>
  );
}
