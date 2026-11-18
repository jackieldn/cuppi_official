import { Check, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { planCell } from '@/lib/feature-sections';
import type { FeatureTint, PlanRow } from '@/lib/features-types';
import { MarkedText } from '../marked-text';
import { TINTS } from './tints';

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
 * The Free / Pro table: a line for each thing, what Free gets, what Pro gets. Used on a feature's own page
 * (PlansBlock) and on the Plans page, so the two always look alike. `title` is what screen readers hear
 * the table is about; the Pro column wears `tint`.
 */
export function PlanTable({ title, rows, tint }: { title: string; rows: PlanRow[]; tint: FeatureTint }) {
  const t = TINTS[tint];
  return (
    <div className="overflow-hidden rounded-[1.75rem] border border-cuppi-line bg-cuppi-card">
      <table className="w-full table-fixed border-collapse text-left">
        <caption className="sr-only">{title}: what Free and Pro each include</caption>
        <thead>
          <tr>
            <th scope="col" className="w-[46%] px-4 py-4 sm:px-6">
              <span className="sr-only">What you get</span>
            </th>
            <th scope="col" className="px-2 py-4 text-center font-headline text-lg font-normal sm:text-xl">
              Free
            </th>
            <th scope="col" className={cn('px-2 py-4 text-center', t.surface, t.text)}>
              <span className={cn('inline-block rounded-full px-3.5 py-1 font-headline text-lg font-normal sm:text-xl', t.chip)}>Pro</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-t border-cuppi-line">
              <th scope="row" className="px-4 py-3.5 text-sm font-medium leading-snug sm:px-6 sm:text-base">
                <MarkedText text={row.label} />
              </th>
              <td className="px-2 py-3.5 text-center text-sm leading-snug text-cuppi-ink-soft sm:text-base">
                <Cell value={row.free} />
              </td>
              <td className={cn('px-2 py-3.5 text-center text-sm font-medium leading-snug sm:text-base', t.surface, t.text)}>
                <Cell value={row.pro} onDark={t.dark} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
