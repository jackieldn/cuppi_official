import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { splitEmphasis, type HomeHero as HomeHeroData } from '@/lib/home-hero';
import { PhoneMockup } from '../blocks/phone-mockup';
import { patternUrl } from '../pattern-overlay';
import { SpotlightPattern } from '../spotlight-pattern';
import { HeroIntro } from './hero-intro';
import { TINTS } from '../blocks/tints';

/** The home page's opening block: what's new, in a big colour block, with the app on show. */
export function HomeHero({ hero }: { hero: HomeHeroData }) {
  const tint = TINTS[hero.tint];
  const { screenshot: shot } = hero;
  return (
    <section className="w-full px-3 pt-3 sm:px-6">
      <HeroIntro
        patternUrl={hero.pattern ? patternUrl(hero.pattern.url) : undefined}
        className={cn('relative mx-auto max-w-6xl overflow-hidden rounded-[2.5rem]', tint.surface, tint.text)}
      >
        {/* Far layer: the pattern. The intro scales this wrapper, so the pattern inside keeps its own fade and cursor light. */}
        {hero.pattern && (
          <div className="intro-far pointer-events-none absolute inset-0">
            <SpotlightPattern
              pattern={hero.pattern.url}
              focus={hero.pattern.focus}
              size={hero.pattern.size}
              centre={hero.pattern.centre}
              edge={hero.pattern.edge}
              spot={hero.pattern.spot}
              radius={hero.pattern.radius}
            />
          </div>
        )}
        {/* The words (middle layer) and the phone (nearest layer) are separate layers so the phone travels faster. `relative` keeps them above the pattern. */}
        <div className="relative grid items-stretch md:grid-cols-[1.1fr_1fr]">
          <div className="intro-mid flex flex-col justify-center gap-6 px-7 pb-6 pt-12 sm:px-12 md:py-20">
            <h1 className="font-headline text-5xl font-normal leading-[1.02] tracking-tight text-balance sm:text-6xl lg:text-7xl">
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

            <p className={cn('max-w-md text-xl leading-relaxed', tint.muted)}>
              {hero.body}
            </p>

            {hero.link && (
              <div className="intro-late">
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
          <div className="intro-near relative min-h-[30rem] md:min-h-[36rem]">
            <div className="absolute inset-0">
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
      </HeroIntro>
    </section>
  );
}
