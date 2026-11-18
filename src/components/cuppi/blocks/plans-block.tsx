import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { Reveal } from '@/components/ui/reveal';
import type { Feature, FeatureBlock } from '@/lib/features-types';
import { AppTile } from '../feature-icon';
import { MarkedText } from '../marked-text';
import { PlanTable } from './plan-table';

type Plans = Extract<FeatureBlock, { type: 'plans' }>;

/**
 * The feature's app icon, a title and a few words, then a table of what Free and Pro each get, and a way on to the
 * Plans page, where every feature's table sits under the others (it opens at this feature's own). The icon is the
 * current feature's own; without a feature (never on the site) the icon and the link are left out.
 */
export function PlansBlock({ block, feature }: { block: Plans; feature?: Pick<Feature, 'iconUrl' | 'icon' | 'tile' | 'name' | 'slug'> }) {
  return (
    <section className="mx-auto max-w-4xl px-3 py-10 sm:px-6">
      <Reveal className="flex flex-col items-center px-4 pb-8 text-center sm:px-6">
        {feature && <AppTile feature={feature} eager className="mb-5 h-20 w-20 drop-shadow-[0_10px_16px_rgb(var(--c-shadow)/0.18)] sm:h-24 sm:w-24" />}
        <h2 className="font-headline font-normal text-3xl tracking-tight sm:text-4xl">
          <MarkedText text={block.title} />
        </h2>
        {block.intro && (
          <p className="mt-3 max-w-xl text-lg leading-relaxed text-cuppi-ink-soft">
            <MarkedText text={block.intro} />
          </p>
        )}
      </Reveal>

      <Reveal>
        <PlanTable title={block.title} rows={block.rows} tint={block.tint} />
        {feature && (
          <p className="mt-4 text-center">
            <Link href={`/plans#${feature.slug}`} className="inline-flex items-center gap-1.5 text-sm font-medium text-cuppi-brand-deep underline-offset-4 hover:underline sm:text-base">
              Compare every plan <ArrowUpRight className="h-4 w-4" aria-hidden />
            </Link>
          </p>
        )}
      </Reveal>
    </section>
  );
}
