import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { APP_STORE_URL } from '@/lib/invite';
import { STATUS_LABELS, type Feature } from '@/lib/features-types';
import { FeatureGlyph } from '../feature-icon';
import { Phone, Shapes } from './phone';
import { TINTS } from './tints';

/** The top of a feature page: a big colour block, words on one side, the phone on the other. */
export function FeatureHero({ feature }: { feature: Feature }) {
  const tint = TINTS[feature.tint];
  const status = STATUS_LABELS[feature.status];
  const wide = feature.hero.imageStyle === 'wide';

  return (
    <section className="px-3 pt-3 sm:px-6">
      <div className={cn('relative mx-auto max-w-6xl overflow-hidden rounded-[2.5rem]', tint.surface, tint.text)}>
        <Shapes shape={tint.shape} />
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

            <div className="cuppi-fade-up flex items-center gap-3" style={{ '--d': '80ms' } as React.CSSProperties}>
              <span className={cn('grid h-11 w-11 place-items-center rounded-2xl', tint.dark ? 'bg-cuppi-paper/15' : tint.chip)}>
                <FeatureGlyph icon={feature.icon} className="h-5 w-5" />
              </span>
              <span className="text-sm font-semibold uppercase tracking-[0.14em] opacity-80">{feature.name}</span>
              {status && (
                <span className="rounded-full bg-cuppi-paper/80 px-2.5 py-0.5 text-xs font-semibold text-cuppi-ink">{status}</span>
              )}
            </div>

            <h1
              className="cuppi-fade-up font-headline text-4xl font-semibold leading-[1.05] tracking-tight [font-variation-settings:'SOFT'_100] sm:text-5xl lg:text-6xl"
              style={{ '--d': '160ms' } as React.CSSProperties}
            >
              {feature.hero.headline}
            </h1>
            <p className={cn('cuppi-fade-up max-w-xl text-lg leading-relaxed', tint.muted)} style={{ '--d': '260ms' } as React.CSSProperties}>
              {feature.hero.intro}
            </p>

            <div className="cuppi-fade-up flex flex-wrap items-center gap-3" style={{ '--d': '360ms' } as React.CSSProperties}>
              <a
                href={APP_STORE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full bg-cuppi-brand-deep px-6 py-3 font-semibold text-cuppi-card transition-transform duration-300 [transition-timing-function:var(--ease-spring)] hover:-translate-y-0.5 hover:scale-[1.03]"
              >
                Download Cuppi
              </a>
              <Link
                href="/features"
                className="rounded-full border border-current/25 px-6 py-3 font-semibold transition-colors hover:bg-cuppi-paper/50"
              >
                Explore more
              </Link>
            </div>
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
