import { Check, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Reveal } from '@/components/ui/reveal';
import { planCell } from '@/lib/feature-sections';
import type { Feature, FeatureBlock } from '@/lib/features-types';
import { AppTile } from '../feature-icon';
import { MarkedText } from '../marked-text';
import { TINTS } from './tints';

type Plans = Extract<FeatureBlock, { type: 'plans' }>;

/** One cell of the table: a tick, a dash, or the words. Ticks and dashes say what they mean to screen readers. */
function Cell({ value, onDark }: { value: string; onDark?: boolean }) {
  const cell = planCell(value);
  if (cell.kind === 'yes') {
    return (
      <>
        <span aria-hidden className={cn('mx-auto grid h-6 w-6 place-items-center rounded-full', onDark ? 'bg-cuppi-cream text-cuppi-lake' : 'bg-cuppi-moss-deep text-cuppi-cream')}>
          <Check className="h-3.5 w-3.5" strokeWidth={3} />
        </span>
        <span className="sr-only">Included</span>
      </>
    );
  }
  if (cell.kind === 'no') {
    return (
      <>
        <Minus aria-hidden className={cn('mx-auto h-4 w-4', onDark ? 'text-cuppi-cream/60' : 'text-cuppi-ink-soft/60')} />
        <span className="sr-only">Not included</span>
      </>
    );
  }
  return <MarkedText text={cell.text} />;
}

/**
 * The feature's app icon, a title and a few words, then a table of what Free and Pro each get.
 * The icon is the current feature's own; without a feature (never on the site) it is left out.
 */
export function PlansBlock({ block, feature }: { block: Plans; feature?: Pick<Feature, 'iconUrl' | 'icon' | 'tile' | 'name'> }) {
  const tint = TINTS[block.tint];
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
        <div className="overflow-hidden rounded-[1.75rem] border border-cuppi-line bg-cuppi-card">
          <table className="w-full table-fixed border-collapse text-left">
            <caption className="sr-only">{block.title}: what Free and Pro each include</caption>
            <thead>
              <tr>
                <th scope="col" className="w-[46%] px-4 py-4 sm:px-6">
                  <span className="sr-only">What you get</span>
                </th>
                <th scope="col" className="px-2 py-4 text-center font-headline text-lg font-normal sm:text-xl">
                  Free
                </th>
                <th scope="col" className={cn('px-2 py-4 text-center', tint.surface, tint.text)}>
                  <span className={cn('inline-block rounded-full px-3.5 py-1 font-headline text-lg font-normal sm:text-xl', tint.chip)}>Pro</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, i) => (
                <tr key={i} className="border-t border-cuppi-line">
                  <th scope="row" className="px-4 py-3.5 text-sm font-medium leading-snug sm:px-6 sm:text-base">
                    <MarkedText text={row.label} />
                  </th>
                  <td className="px-2 py-3.5 text-center text-sm leading-snug text-cuppi-ink-soft sm:text-base">
                    <Cell value={row.free} />
                  </td>
                  <td className={cn('px-2 py-3.5 text-center text-sm font-medium leading-snug sm:text-base', tint.surface, tint.text)}>
                    <Cell value={row.pro} onDark={tint.dark} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Reveal>
    </section>
  );
}
