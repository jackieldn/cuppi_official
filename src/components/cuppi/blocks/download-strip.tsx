import { Reveal } from '@/components/ui/reveal';
import { APP_STORE_URL } from '@/lib/invite';
import { Shapes } from './phone';

/** The closing call to action. One button, one sentence. */
export function DownloadStrip() {
  return (
    <Reveal className="px-3 pb-6 pt-4 sm:px-6">
      <section className="relative mx-auto max-w-6xl overflow-hidden rounded-[2.5rem] bg-cuppi-lake px-7 py-16 text-center text-cuppi-paper sm:py-20">
        <Shapes shape="bg-cuppi-sky/20" />
        <h2 className="relative mx-auto max-w-2xl font-headline text-3xl font-semibold leading-tight tracking-tight [font-variation-settings:'SOFT'_100] sm:text-5xl">
          Save it once. Get reminded gently, forever.
        </h2>
        <p className="relative mx-auto mt-4 max-w-md text-lg text-cuppi-paper/75">Cuppi is your calm and private household app.</p>
        <a
          href={APP_STORE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="relative mt-8 inline-block rounded-full bg-cuppi-honey px-8 py-3.5 font-semibold text-cuppi-ink transition-transform duration-300 [transition-timing-function:var(--ease-spring)] hover:-translate-y-0.5 hover:scale-105"
        >
          Download on the App Store
        </a>
      </section>
    </Reveal>
  );
}
