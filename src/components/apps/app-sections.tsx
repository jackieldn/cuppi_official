'use client';

import { useState } from 'react';
import { Reveal } from '@/components/ui/reveal';
import { ImageLightbox } from '@/components/ui/image-lightbox';
import { cn } from '@/lib/utils';
import {
  hostOf,
  sectionImages,
  type App,
  type FeatureSection,
  type GallerySection,
  type ShowcaseImage,
} from '@/lib/showcase';
import { DeviceFrame } from './device-frame';
import { RichText } from './rich-text';

interface AppSectionsProps {
  app: App;
}

/**
 * The body of a detail page: the sections the admin built, in order. A gallery is a row
 * of screenshots; a feature is text on one side and a screenshot on the other. Every
 * screenshot opens in the shared full-size viewer, which steps through the whole page.
 */
export function AppSections({ app }: AppSectionsProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const host = hostOf(app.link);

  // Where each section's pictures start in the viewer's flat list.
  let cursor = 0;
  const starts = app.sections.map((s) => {
    const start = cursor;
    cursor += s.type === 'gallery' ? s.images.length : s.image ? 1 : 0;
    return start;
  });

  const open = (index: number) => setLightboxIndex(index);

  return (
    <>
      {app.sections.map((section, i) =>
        section.type === 'gallery' ? (
          <Gallery key={section.id} app={app} section={section} host={host} start={starts[i]} onOpen={open} />
        ) : (
          <Feature key={section.id} app={app} section={section} host={host} start={starts[i]} onOpen={open} />
        )
      )}
      <ImageLightbox
        images={sectionImages(app.sections).map((image, n) => ({ src: image.url, alt: `${app.title} screenshot ${n + 1}` }))}
        index={lightboxIndex}
        onIndexChange={setLightboxIndex}
        title={`${app.title} screenshots`}
      />
    </>
  );
}

interface PartProps {
  app: App;
  host: string;
  start: number;
  onOpen: (index: number) => void;
}

/** A screenshot in its device that opens the viewer when clicked. */
function Shot({ app, host, image, index, onOpen, sizes, className }: {
  app: App;
  host: string;
  image: ShowcaseImage;
  index: number;
  onOpen: (index: number) => void;
  sizes: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onOpen(index)}
      aria-label={`View ${app.title} screenshot ${index + 1} full size`}
      className="group block w-full rounded-[2.1rem] text-left transition-transform duration-300 ease-in-out hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <DeviceFrame
        kind={app.kind}
        image={image}
        alt={`${app.title} screenshot ${index + 1}`}
        host={host}
        sizes={sizes}
        className={cn('transition-shadow duration-300 group-hover:ring-2 group-hover:ring-accent', className)}
      />
    </button>
  );
}

function Heading({ children, className }: { children: string; className?: string }) {
  return (
    <h2 className={cn('font-headline text-3xl font-bold text-palette-sage sm:text-4xl', className)}>{children}</h2>
  );
}

function Gallery({ app, section, host, start, onOpen }: PartProps & { section: GallerySection }) {
  const { images } = section;
  if (images.length === 0) return null;
  const isApp = app.kind === 'app';
  // Phones four across, browser windows two; a lone screenshot gets a width of its own.
  const tile = isApp
    ? 'basis-[calc(50%-0.75rem)] md:basis-[calc(33.333%-1rem)] lg:basis-[calc(25%-1.125rem)]'
    : images.length === 1
      ? 'basis-full max-w-4xl'
      : 'basis-full md:basis-[calc(50%-1rem)]';
  return (
    <section className="py-12 sm:py-20">
      <div className="container mx-auto px-4">
        {section.title && (
          <Reveal>
            <Heading className="mb-12 text-center">{section.title}</Heading>
          </Reveal>
        )}
        <div className={cn('mx-auto flex flex-wrap items-start justify-center', isApp ? 'max-w-5xl gap-6' : 'max-w-6xl gap-8')}>
          {images.map((image, i) => (
            <Reveal key={`${image.url}-${i}`} stagger={90} className={tile}>
              <Shot
                app={app}
                host={host}
                image={image}
                index={start + i}
                onOpen={onOpen}
                sizes={isApp ? '(max-width: 768px) 50vw, 25vw' : '(max-width: 768px) 100vw, 50vw'}
              />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function Feature({ app, section, host, start, onOpen }: PartProps & { section: FeatureSection }) {
  const hasText = !!(section.title || section.body);
  const { image } = section;
  if (!hasText && !image) return null;
  const isApp = app.kind === 'app';
  const textRight = section.textSide === 'right';

  const text = hasText && (
    <Reveal className={cn(textRight && image && 'lg:order-2', !image && 'mx-auto max-w-3xl')}>
      {section.title && <Heading className="mb-6">{section.title}</Heading>}
      {section.body && <RichText text={section.body} className="text-lg leading-8 text-foreground/80" />}
    </Reveal>
  );

  const picture = image && (
    <Reveal className={cn('w-full', textRight && hasText && 'lg:order-1', !hasText && 'mx-auto')}>
      <div className={cn('mx-auto', isApp ? 'max-w-[17.5rem]' : 'max-w-2xl', !isApp && !hasText && 'max-w-4xl')}>
        <Shot
          app={app}
          host={host}
          image={image}
          index={start}
          onOpen={onOpen}
          sizes={isApp ? '280px' : '(max-width: 1024px) 100vw, 672px'}
        />
      </div>
    </Reveal>
  );

  return (
    <section className="py-12 sm:py-20">
      <div className="container mx-auto px-4">
        <div
          className={cn(
            'mx-auto items-center gap-10 lg:gap-20',
            hasText && image ? 'grid max-w-6xl grid-cols-1 lg:grid-cols-2' : 'max-w-6xl'
          )}
        >
          {text}
          {picture}
        </div>
      </div>
    </section>
  );
}
