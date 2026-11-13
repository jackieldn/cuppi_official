import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { splitEmphasis, type HomeHero as HomeHeroData } from '@/lib/home-hero';
import type { HeroTemplate } from '@/lib/home-hero-settings';
import { PhoneMockup } from '../blocks/phone-mockup';
import { patternUrl } from '../pattern-overlay';
import { SpotlightPattern } from '../spotlight-pattern';
import { HeroIntro } from './hero-intro';
import { TINTS } from '../blocks/tints';
import { MarkedText } from '../marked-text';

type Hero = HomeHeroData & { template?: HeroTemplate };

/**
 * The home page's opening block: what's new, in a big colour block, with the app on show.
 * Three templates share the same words and phone and differ only in how they are laid out:
 *   split          words left, phone right (the original)
 *   split-reverse  phone left, words right
 *   centred        words in the middle, the phone rising from the bottom edge
 * `instant` plays no opening shot, so the hero is there at once (the admin's preview starts that way).
 */
export function HomeHero({ hero, instant = false }: { hero: Hero; instant?: boolean }) {
  const tint = TINTS[hero.tint];
  const template = hero.template ?? 'split';
  const centred = template === 'centred';
  const reverse = template === 'split-reverse';

  const words = (
    <div
      className={cn(
        'intro-mid flex flex-col justify-center gap-6 px-7 sm:px-12',
        centred ? 'items-center pb-4 pt-14 text-center md:pt-20' : 'pb-6 pt-12 md:py-20',
        reverse && 'md:order-2',
      )}
    >
      <h1
        className={cn(
          'font-headline font-normal leading-[1.02] tracking-tight text-balance',
          centred ? 'max-w-3xl text-5xl sm:text-6xl lg:text-7xl' : 'text-5xl sm:text-6xl lg:text-7xl',
        )}
      >
        {splitEmphasis(hero.headline).map((part, i) =>
          part.em ? (
            // Orange is too dim on the dark (lake) block; honey stays readable there.
            <em key={i} className={cn('whitespace-nowrap', tint.dark ? 'text-cuppi-honey' : 'text-cuppi-brand')}>
              <MarkedText text={part.text} />
            </em>
          ) : (
            <span key={i}><MarkedText text={part.text} /></span>
          ),
        )}
      </h1>

      {hero.body && <p className={cn('max-w-md text-xl leading-relaxed', centred && 'max-w-xl', tint.muted)}><MarkedText text={hero.body} /></p>}

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
  );

  const { screenshot: shot } = hero;
  // In the two split templates the phone is sized from the block's height (taller than the block),
  // so the same part of the screen shows at any width. Centred, it is cropped by a fixed-height window.
  const phone = (
    <div
      className={cn(
        'intro-near relative',
        centred ? 'h-[22rem] overflow-hidden sm:h-[26rem] md:h-[30rem]' : 'min-h-[30rem] md:min-h-[36rem]',
        reverse && 'md:order-1',
      )}
    >
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
          className={cn('absolute left-1/2 -translate-x-1/2', centred ? 'top-[4%] h-[190%]' : 'top-[5%] h-[175%]')}
        />
      </div>
    </div>
  );

  return (
    <section className="w-full px-3 pt-3 sm:px-6">
      <HeroIntro
        template={template}
        seconds={hero.introSeconds}
        instant={instant}
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
        <div
          className={cn(
            'relative grid items-stretch',
            !centred && (reverse ? 'md:grid-cols-[1fr_1.1fr]' : 'md:grid-cols-[1.1fr_1fr]'),
          )}
        >
          {words}
          {phone}
        </div>
      </HeroIntro>
    </section>
  );
}
