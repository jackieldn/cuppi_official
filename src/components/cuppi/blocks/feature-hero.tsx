import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PageFeature } from '@/lib/features-types';
import { Phone } from './phone';
import { TINTS } from './tints';

/** The top of a feature page: a big colour block, words on one side, the phone on the other. */
export function FeatureHero({ feature }: { feature: PageFeature }) {
  const tint = TINTS[feature.tint];
  const wide = feature.hero.imageStyle === 'wide';

  return (
    <section className="px-3 pt-3 sm:px-6">
      <div className={cn('relative mx-auto max-w-6xl overflow-hidden rounded-[2.5rem]', tint.surface, tint.text)}>
        <div className="relative grid items-stretch md:grid-cols-[1.05fr_1fr]">
          <div className="flex flex-col justify-center gap-6 px-7 pb-4 pt-10 sm:px-12 md:py-16">
            <Link
              href="/features"
              className={cn(
                'cuppi-fade-up inline-flex w-fit items-center gap-1.5 rounded-full bg-cuppi-paper/90 px-3.5 py-1.5 text-sm font-medium text-cuppi-ink',
                'transition-colors hover:bg-cuppi-paper',
              )}
              style={{ '--d': '0ms' } as React.CSSProperties}
            >
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden /> All features
            </Link>


            <h1
              className="cuppi-fade-up font-headline font-normal text-4xl leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl"
              style={{ '--d': '160ms' } as React.CSSProperties}
            >
              {feature.hero.headline}
            </h1>
            <p className={cn('cuppi-fade-up max-w-xl text-lg leading-relaxed', tint.muted)} style={{ '--d': '260ms' } as React.CSSProperties}>
              {feature.hero.intro}
            </p>

          </div>

          <div className={cn('relative min-h-[22rem] md:min-h-[34rem]', wide && 'flex items-center p-2 md:p-4')}>
            {wide ? (
              <div className="cuppi-rise w-full" style={{ '--d': '200ms' } as React.CSSProperties}>
                <Image
                  src={feature.hero.image.url}
                  alt={feature.hero.image.alt}
                  width={1319}
                  height={1000}
                  sizes="(max-width: 768px) 92vw, 46vw"
                  priority
                  className="h-auto w-full drop-shadow-[0_24px_30px_rgba(43,33,24,0.18)]"
                />
              </div>
            ) : (
              <div className="cuppi-rise absolute inset-0" style={{ '--d': '200ms' } as React.CSSProperties}>
                <Phone image={feature.hero.image} sizes="(max-width: 768px) 92vw, 46vw" priority sink={3} />
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
