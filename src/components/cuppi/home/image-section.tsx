import Image from 'next/image';
import type { HomeSection } from '@/lib/home-page-types';

type ImageSectionData = Extract<HomeSection, { kind: 'image' }>;

export function HomeImageSection({ section }: { section: ImageSectionData }) {
  return (
    <section id={section.id} className="bg-white text-black w-full max-w-6xl py-24 sm:py-32 mt-16 rounded-[2rem] scroll-mt-24">
      <div className="px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div className="relative aspect-[4/3]">
            <Image
              src={section.image.url}
              alt={section.image.alt}
              fill
              sizes="(max-width: 768px) 90vw, 45vw"
              className="object-contain"
            />
          </div>
          <div className="text-center">
            <h2 className="text-xl font-semibold text-neutral-600">{section.eyebrow}</h2>
            <h3 className="font-serif text-4xl md:text-6xl font-bold tracking-tight mt-2">
              {section.heading}
            </h3>
            <p className="mt-6 text-lg md:text-xl text-neutral-700 max-w-md mx-auto">
              {section.intro}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
