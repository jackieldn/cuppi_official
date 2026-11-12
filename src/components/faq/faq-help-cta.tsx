import Link from 'next/link';

export function FaqHelpCta() {
  return (
    <section
      aria-labelledby="faq-help"
      className="flex flex-wrap items-center justify-between gap-x-8 gap-y-5 rounded-[2.5rem] bg-cuppi-honey-soft px-7 py-9 sm:px-12"
    >
      <div>
        <h2 id="faq-help" className="font-headline text-3xl">
          Can’t find your answer?
        </h2>
        <p className="mt-2 text-lg text-cuppi-ink-soft">Message us and we aim to reply within 24–48 hours.</p>
      </div>
      <Link
        href="/support"
        className="rounded-full bg-cuppi-paper px-7 py-3.5 text-lg font-semibold text-cuppi-ink transition-transform duration-300 [transition-timing-function:var(--ease-spring)] hover:-translate-y-0.5 hover:scale-[1.03]"
      >
        Contact support
      </Link>
    </section>
  );
}
