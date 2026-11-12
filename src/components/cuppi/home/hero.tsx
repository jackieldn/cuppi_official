import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { splitEmphasis, type HomeHero as HomeHeroData } from '@/lib/home-hero';
import { PhoneMockup } from '../blocks/phone-mockup';
import { TINTS } from '../blocks/tints';

const delay = (ms: number) => ({ '--d': `${ms}ms` }) as React.CSSProperties;

/** The home page's opening block: what's new, in a big colour block, with the app on show. */
export function HomeHero({ hero }: { hero: HomeHeroData }) {
  const tint = TINTS[hero.tint];
  const { screenshot: shot } = hero;
  return (
    <section className="w-full px-3 pt-3 sm:px-6">
      <div className={cn('relative mx-auto max-w-6xl overflow-hidden rounded-[2.5rem]', tint.surface, tint.text)}>
        <div className="grid items-stretch md:grid-cols-[1.1fr_1fr]">
          <div className="flex flex-col justify-center gap-6 px-7 pb-6 pt-12 sm:px-12 md:py-20">
            <span
              className="cuppi-fade-up inline-flex w-fit items-center gap-2 rounded-full bg-cuppi-paper/90 px-4 py-1.5 text-sm font-semibold text-cuppi-ink"
              style={delay(0)}
            >
              <span aria-hidden className="h-2 w-2 rounded-full bg-cuppi-brand" />
              {hero.badge}
            </span>

            <h1
              className="cuppi-fade-up font-headline text-5xl font-normal leading-[1.02] tracking-tight text-balance sm:text-6xl lg:text-7xl"
              style={delay(100)}
            >
              {splitEmphasis(hero.headline).map((part, i) =>
                part.em ? (
                  <em key={i} className="whitespace-nowrap text-cuppi-brand">
                    {part.text}
                  </em>
                ) : (
                  <span key={i}>{part.text}</span>
                ),
              )}
            </h1>

            <p className={cn('cuppi-fade-up max-w-md text-xl leading-relaxed', tint.muted)} style={delay(220)}>
              {hero.body}
            </p>

            {hero.link && (
              <div className="cuppi-fade-up" style={delay(340)}>
                <Link
                  href={hero.link.href}
                  className="group inline-flex items-center gap-2 rounded-full bg-cuppi-paper/90 px-6 py-3 text-lg font-semibold text-cuppi-ink transition-colors hover:bg-cuppi-paper"
                >
                  {hero.link.label}
                  <ArrowRight className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" aria-hidden />
                </Link>
              </div>
            )}
          </div>

          {/* The phone is sized from the block's height (taller than the block), so the same part of the screen shows at any width. */}
          <div className="relative min-h-[30rem] md:min-h-[36rem]">
            <div className="cuppi-rise absolute inset-0" style={delay(200)}>
              <PhoneMockup
                kind={hero.mockup}
                flip={hero.flip}
                src={shot.url}
                alt={shot.alt}
                imageWidth={shot.width}
                imageHeight={shot.height}
                bg={shot.bg}
                sizes="(max-width: 768px) 60vw, 30vw"
                priority
                className="absolute left-1/2 top-[5%] h-[175%] -translate-x-1/2"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
