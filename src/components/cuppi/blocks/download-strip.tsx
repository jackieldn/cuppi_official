import { Reveal } from '@/components/ui/reveal';
import { APP_STORE_URL } from '@/lib/invite';
import { ActionButton } from '../action-button';

/** The closing call to action. One button, one sentence. */
export function DownloadStrip() {
  return (
    <Reveal className="px-3 pb-6 pt-4 sm:px-6">
      <section className="relative mx-auto max-w-6xl overflow-hidden rounded-[2.5rem] bg-cuppi-lake px-7 py-16 text-center text-cuppi-paper sm:py-20">
        <h2 className="relative mx-auto max-w-2xl font-headline font-normal text-3xl leading-tight tracking-tight sm:text-5xl">
          Save it once. Get reminded gently, forever.
        </h2>
        <p className="relative mx-auto mt-4 max-w-md text-lg text-cuppi-paper/75">Cuppi is your calm and private household app.</p>
        <ActionButton href={APP_STORE_URL} external size="lg" className="relative mt-8">
          Download on the App Store
        </ActionButton>
      </section>
    </Reveal>
  );
}
