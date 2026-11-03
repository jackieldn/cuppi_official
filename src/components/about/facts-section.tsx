'use client';

import { Fact } from '@/lib/about-types';
import { Separator } from '../ui/separator';
import { Reveal } from '../ui/reveal';

interface FactsSectionProps {
  facts: Fact[];
}

export function FactsSection({ facts }: FactsSectionProps) {
  if (!facts || facts.length === 0) {
    return null;
  }

  return (
    <section>
       <Separator className="my-16" />
      <Reveal className="container mx-auto px-4 text-center">
         <h2 className="font-headline text-5xl font-bold tracking-tight text-foreground sm:text-6xl mb-16">
          Facts
        </h2>
      </Reveal>
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-12">
        {facts.map((fact) => (
          <Reveal key={fact.id} stagger={100}>
            <h3 className="font-headline text-xl font-bold">{fact.title}</h3>
            <p className="mt-2 text-foreground/80 whitespace-pre-line">{fact.description}</p>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
