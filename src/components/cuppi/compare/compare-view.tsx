import { Reveal } from '@/components/ui/reveal';
import type { PlansPrices } from '@/lib/plans-settings';
import { WHY_INTRO, numberSources } from '@/lib/compare-data';
import { CompareMatrix } from './compare-matrix';
import { CompareShots } from './compare-shots';
import { DataSection, PriceSection, SourcesList, WhyCuppi } from './compare-sections';

function Heading({ id, title, intro }: { id: string; title: string; intro?: string }) {
  return (
    <Reveal className="px-2 pb-6 text-center sm:px-4">
      <h2 id={id} className="font-headline text-3xl font-normal leading-tight tracking-tight sm:text-4xl">
        {title}
      </h2>
      {intro && <p className="mx-auto mt-2 max-w-2xl text-lg leading-relaxed text-cuppi-ink-soft">{intro}</p>}
    </Reveal>
  );
}

/**
 * The body of the comparison page: why Cuppi, a look at each app, the feature matrix, what each says it tracks, what they
 * cost, and where it all came from. It draws what it is given (Cuppi's prices come from the Plans settings) and knows
 * nothing about the database.
 */
export function CompareView({ prices }: { prices: PlansPrices }) {
  const numbers = numberSources();
  return (
    <div className="mx-auto w-full max-w-5xl px-3 pb-8 sm:px-6">
      <section aria-labelledby="why-title" className="pt-8">
        <Heading id="why-title" title="Why Cuppi" intro={WHY_INTRO} />
        <WhyCuppi />
      </section>

      <section aria-labelledby="look-title" className="pt-14">
        <Heading id="look-title" title="A look inside" intro="The same few taps, in each app." />
        <CompareShots />
      </section>

      <section id="features" aria-labelledby="features-title" className="scroll-mt-28 pt-14">
        <Heading id="features-title" title="Feature by feature" intro="What Cuppi does, and what the others say they do." />
        <Reveal>
          <CompareMatrix numbers={numbers} />
        </Reveal>
      </section>

      <div id="data" className="scroll-mt-28 pt-14">
        <DataSection numbers={numbers} />
      </div>

      <section id="price" aria-labelledby="price-title" className="scroll-mt-28 pt-14">
        <Heading id="price-title" title="What it costs" intro="A month of each, and how each one pays its way." />
        <Reveal>
          <PriceSection prices={prices} numbers={numbers} />
        </Reveal>
      </section>

      <section id="sources" aria-labelledby="sources-title" className="scroll-mt-28 pt-14">
        <Heading id="sources-title" title="Where this comes from" />
        <Reveal className="px-2 sm:px-4">
          <SourcesList numbers={numbers} />
        </Reveal>
      </section>
    </div>
  );
}
