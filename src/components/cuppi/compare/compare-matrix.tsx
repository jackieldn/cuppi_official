import { Check, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { APP_IDS, APP_NAMES, FACT_GROUPS, NOT_YET, isHighlighted, type Cell } from '@/lib/compare-data';
import { TINTS } from '../blocks/tints';
import { SourceRefs } from './source-refs';

const honey = TINTS.honey;

/**
 * One cell: a tick (with a small note under it when there is one, such as "Premium only"), a dash, a few words, or "To confirm".
 * Ticks and dashes say what they mean to screen readers. `refs` is the cell's source numbers, placed beside a bare tick or dash
 * and on the end of a note or of the words.
 */
function CellView({ cell, refs }: { cell: Cell; refs: React.ReactNode }) {
  if (cell.kind === 'yes') {
    const tick = (
      <>
        <span aria-hidden className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-cuppi-moss-deep text-cuppi-cream">
          <Check className="h-3.5 w-3.5" strokeWidth={3} />
        </span>
        <span className="sr-only">Yes</span>
      </>
    );
    if (!cell.text) return <div className="flex items-center justify-center gap-0.5">{tick}{refs}</div>;
    return (
      <div className="flex flex-col items-center gap-1">
        {tick}
        <span className="text-[0.7rem] font-normal leading-tight sm:text-xs">
          {cell.text}
          {refs}
        </span>
      </div>
    );
  }
  if (cell.kind === 'no') {
    return (
      <div className="flex items-center justify-center gap-0.5">
        <Minus aria-hidden className="h-4 w-4 text-cuppi-ink-soft/60" />
        <span className="sr-only">Not found</span>
        {refs}
      </div>
    );
  }
  if (cell.kind === 'tbc') {
    return (
      <span className="italic">
        {cell.text ? `${cell.text}, to confirm` : 'To confirm'}
        {refs}
      </span>
    );
  }
  return (
    <>
      {cell.text}
      {refs}
    </>
  );
}

/**
 * The feature comparison: Cuppi's column first and tinted, then the others, in groups. Each row says what Cuppi does in a
 * line under its name. Every claim about another app carries the small number of its source.
 */
export function CompareMatrix({ numbers }: { numbers: Map<string, number> }) {
  return (
    <div className="overflow-hidden rounded-[1.75rem] border border-cuppi-line bg-cuppi-card">
      <table className="w-full table-fixed border-collapse text-left">
        <caption className="sr-only">How Cuppi, Hartley and FamilyWall compare, feature by feature</caption>
        <thead>
          <tr>
            <th scope="col" className="w-[34%] px-3 py-4 sm:w-[38%] sm:px-6">
              <span className="sr-only">Feature</span>
            </th>
            {APP_IDS.map((app) => (
              <th
                key={app}
                scope="col"
                className="px-0.5 py-4 text-center font-headline text-xs font-normal sm:px-1 sm:text-xl"
              >
                {app === 'cuppi' ? <span className={cn('inline-block rounded-full px-2.5 py-0.5 sm:px-3', honey.chip)}>{APP_NAMES[app]}</span> : APP_NAMES[app]}
              </th>
            ))}
          </tr>
        </thead>
        {FACT_GROUPS.map((group) => (
          <tbody key={group.id}>
            <tr>
              <th colSpan={4} scope="colgroup" className="border-t border-cuppi-line bg-cuppi-paper-deep px-3 py-2.5 font-headline text-base font-normal sm:px-6 sm:text-lg">
                {group.title}
              </th>
            </tr>
            {group.rows.map((row) => (
              <tr key={row.id} className="border-t border-cuppi-line">
                <th scope="row" className="px-3 py-3.5 align-middle sm:px-6">
                  <span className="block text-sm font-medium leading-snug sm:text-base">{row.label}</span>
                  {row.detail && <span className="mt-0.5 block text-xs font-normal leading-snug text-cuppi-ink-soft sm:text-sm">{row.detail}</span>}
                </th>
                {APP_IDS.map((app) => (
                  // A tick (or good news in words) lights its cell in the same honey as Cuppi's name, whichever app it is.
                  <td
                    key={app}
                    className={cn(
                      '[overflow-wrap:anywhere] px-1 py-3.5 text-center align-middle text-xs leading-snug sm:px-2 sm:text-sm',
                      isHighlighted(row.cells[app]) ? cn(honey.surface, honey.text, 'font-medium') : 'text-cuppi-ink-soft',
                    )}
                  >
                    <CellView cell={row.cells[app]} refs={app !== 'cuppi' ? <SourceRefs ids={row.sources[app]} numbers={numbers} /> : null} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        ))}
      </table>
      <p className="border-t border-cuppi-line px-4 py-3.5 text-sm text-cuppi-ink-soft sm:px-6">{NOT_YET}</p>
    </div>
  );
}
