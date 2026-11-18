import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Reveal } from '@/components/ui/reveal';
import { hasPage, type Feature } from '@/lib/features-types';
import type { PlanSection, PlansSettings } from '@/lib/plans-settings';
import { FadeImage } from '../fade-image';
import { PlanTable } from '../blocks/plan-table';
import { TINTS } from '../blocks/tints';
import { AppTile, CuppiTile } from '../feature-icon';
import { MarkedText } from '../marked-text';

/** What a section needs to be drawn: its name, its picture, its colour, and where its feature's own page is. */
type Resolved = { section: PlanSection; name: string; feature?: Feature };

/** Each section with its feature (found by slug), keeping only the ones that have lines to show. Exported so the admin's preview can count them. */
export function resolveSections(settings: PlansSettings, features: Feature[]): Resolved[] {
  const bySlug = new Map(features.map((f) => [f.slug, f]));
  return settings.sections.flatMap((section): Resolved[] => {
    const feature = section.feature ? bySlug.get(section.feature) : undefined;
    const name = feature?.name ?? section.title ?? '';
    return name && section.rows.length > 0 ? [{ section, name, feature }] : [];
  });
}

function Tile({ resolved, className }: { resolved: Resolved; className: string }) {
  return resolved.feature ? <AppTile feature={resolved.feature} className={className} /> : <CuppiTile className={className} />;
}

/** The two plans' pictures (public/images), drawn at one height so the two cards line up. */
const FREE_PICTURE = { src: '/images/cuppi-free-plan.webp', width: 1103, height: 686 };
const PRO_PICTURE = { src: '/images/cuppi-pro-plan.webp', width: 1103, height: 710 };

function PlanPicture({ picture }: { picture: typeof FREE_PICTURE }) {
  return <FadeImage {...picture} alt="" soft sizes="(max-width: 768px) 70vw, 340px" className="mx-auto mb-6 h-36 w-auto drop-shadow-[0_10px_16px_rgb(var(--c-shadow)/0.15)] sm:h-44" />;
}

/** Free in one card, Pro (monthly and annual side by side) in the other, each under its own picture. */
function Prices({ prices }: { prices: PlansSettings['prices'] }) {
  const honey = TINTS.honey;
  const card = 'flex h-full flex-col rounded-[2rem] px-6 pb-8 pt-8 text-center sm:px-8';
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Reveal stagger={90}>
        <div className={cn(card, 'border border-cuppi-line bg-cuppi-card')}>
          <PlanPicture picture={FREE_PICTURE} />
          <h2 className="font-headline text-2xl font-normal">Free</h2>
          <div className="flex flex-1 flex-col justify-center pt-4">
            <p className="font-headline text-4xl font-normal">£0</p>
            <p className="mt-1 text-cuppi-ink-soft">forever</p>
          </div>
        </div>
      </Reveal>
      <Reveal stagger={90}>
        <div className={cn(card, honey.surface, honey.text)}>
          <PlanPicture picture={PRO_PICTURE} />
          <h2 className="font-headline text-2xl font-normal">Pro</h2>
          <div className="grid flex-1 grid-cols-2 items-start gap-4 pt-4">
            <div>
              <p className="font-headline text-3xl font-normal sm:text-4xl">{prices.monthly}</p>
              <p className={cn('mt-1', honey.muted)}>a month</p>
            </div>
            <div className="border-l border-cuppi-ink/15">
              <p className="font-headline text-3xl font-normal sm:text-4xl">{prices.annual}</p>
              <p className={cn('mt-1', honey.muted)}>a year</p>
              {prices.annualNote && <span className={cn('mt-3 inline-block rounded-full px-3.5 py-1 text-sm font-semibold', honey.chip)}>{prices.annualNote}</span>}
            </div>
          </div>
        </div>
      </Reveal>
    </div>
  );
}

/**
 * The body of the Plans page: the prices, a row of links down to each table, then a table per feature under
 * the others (the feature's icon and name, and the Free and Pro columns). A feature's own page links to its
 * table (`/plans#<slug>`), and each table links back. It draws what it is given and knows nothing about the
 * database, so the admin's preview shows exactly this.
 */
export function PlansView({ settings, features }: { settings: PlansSettings; features: Feature[] }) {
  const sections = resolveSections(settings, features);
  return (
    <div className="mx-auto w-full max-w-4xl px-3 pb-8 sm:px-6">
      <div className="pt-6">
        <Prices prices={settings.prices} />
      </div>

      {sections.length > 1 && (
        <Reveal>
          <nav aria-label="Jump to a feature" className="mt-10 flex flex-wrap items-center justify-center gap-2">
            {sections.map((r) => (
              <a
                key={r.section.id}
                href={`#${r.section.id}`}
                className="inline-flex items-center gap-2.5 rounded-full border border-cuppi-line bg-cuppi-card py-2 pl-2.5 pr-4 text-sm font-medium transition-colors hover:border-cuppi-brand-deep/40 hover:bg-cuppi-paper-deep"
              >
                <Tile resolved={r} className="h-7 w-7" />
                {r.name}
              </a>
            ))}
          </nav>
        </Reveal>
      )}

      {sections.map((r) => {
        const { section, name, feature } = r;
        const tint = feature?.tint ?? 'honey';
        return (
          <section key={section.id} id={section.id} aria-labelledby={`${section.id}-name`} className="scroll-mt-28 pt-14">
            <Reveal className="flex flex-wrap items-center gap-x-4 gap-y-3 px-2 pb-5 sm:px-4">
              <Tile resolved={r} className="h-14 w-14 sm:h-16 sm:w-16" />
              <div className="min-w-0 flex-1">
                <h2 id={`${section.id}-name`} className="font-headline text-3xl font-normal leading-tight tracking-tight sm:text-4xl">
                  {name}
                </h2>
                {section.intro && (
                  <p className="mt-1 max-w-xl text-cuppi-ink-soft">
                    <MarkedText text={section.intro} />
                  </p>
                )}
              </div>
              {feature && hasPage(feature) && (
                <Link
                  href={`/features/${feature.slug}`}
                  className="inline-flex items-center gap-1.5 rounded-full bg-cuppi-paper-deep px-4 py-2 text-sm font-medium transition-colors hover:bg-cuppi-line"
                >
                  About {feature.name} <ArrowUpRight className="h-4 w-4" aria-hidden />
                </Link>
              )}
            </Reveal>
            <Reveal>
              <PlanTable title={name} rows={section.rows} tint={tint} />
            </Reveal>
          </section>
        );
      })}

      {sections.length === 0 && <p className="mt-14 text-center text-cuppi-ink-soft">The full comparison is on its way.</p>}
    </div>
  );
}
