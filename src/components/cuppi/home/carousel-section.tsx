'use client';

import Image from 'next/image';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Carousel, CarouselApi, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import type { HomeSection } from '@/lib/home-page-types';

type CarouselSectionData = Extract<HomeSection, { kind: 'carousel' }>;

export function HomeCarouselSection({ section }: { section: CarouselSectionData }) {
  const [api, setApi] = useState<CarouselApi>();

  return (
    <section id={section.id} className="bg-white text-black w-full max-w-6xl py-24 sm:py-32 mt-16 rounded-[2rem] scroll-mt-24">
      <div className="px-4">
        <div className="text-center max-w-3xl mx-auto">
          <h2 className="text-xl font-semibold text-neutral-600">{section.eyebrow}</h2>
          <h3 className="font-serif text-4xl md:text-6xl font-bold tracking-tight mt-2">
            {section.heading}
          </h3>
          <p className="mt-6 text-lg md:text-xl text-neutral-700 max-w-2xl mx-auto">
            {section.intro}
          </p>
        </div>
        <div className="mt-16">
          <Carousel
            opts={{
              align: "start",
            }}
            className="w-full"
            setApi={setApi}
          >
            <CarouselContent className="-ml-8">
              {section.cards.map((card, index) => (
                <CarouselItem key={index} className="pl-8 basis-4/5 md:basis-2/3 lg:basis-2/5">
                  <div className="flex flex-col text-left">
                    <div className="bg-background rounded-[2rem] overflow-hidden">
                      <Image
                        src={card.image.url}
                        alt={card.image.alt}
                        width={400}
                        height={820}
                        sizes="(max-width: 768px) 80vw, 40vw"
                        className="w-full h-auto object-cover"
                        loading="eager"
                      />
                    </div>
                    <h4 className="font-headline text-2xl font-bold mt-6">{card.title}</h4>
                    <p className="mt-2 text-neutral-600 max-w-xs whitespace-pre-line">
                      {card.description}
                    </p>
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            <div className={cn("mt-4 flex justify-end gap-2 transition-opacity", !api && "opacity-0")}>
              <CarouselPrevious className="static" />
              <CarouselNext className="static" />
            </div>
          </Carousel>
        </div>
        {section.footnotes.length > 0 && (
          <div className="mt-8 text-center text-xs text-neutral-500 space-y-2 max-w-3xl mx-auto">
            {section.footnotes.map((note, index) => (
              <p key={index}>{note}</p>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
