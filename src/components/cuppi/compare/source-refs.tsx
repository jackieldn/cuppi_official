import { sourceById } from '@/lib/compare-data';

/**
 * The small numbers beside a claim, each linking down to its source in the list at the foot of the page.
 * `numbers` is the page's numbering (numberSources), so these and the list always agree.
 */
export function SourceRefs({ ids, numbers, onDark }: { ids?: string[]; numbers: Map<string, number>; onDark?: boolean }) {
  const refs = (ids ?? []).flatMap((id) => {
    const n = numbers.get(id);
    return n ? [{ id, n }] : [];
  });
  if (refs.length === 0) return null;
  return (
    <sup className="ml-0.5 whitespace-nowrap text-[0.7em] font-semibold">
      {refs.map(({ id, n }, i) => (
        <a key={id} href={`#source-${n}`} aria-label={`Source ${n}: ${sourceById(id)?.label ?? ''}`} className={`rounded px-[1px] underline-offset-2 hover:underline ${onDark ? 'text-cuppi-cream' : 'text-cuppi-brand-deep'}`}>
          {i > 0 && <span aria-hidden>,</span>}
          {n}
        </a>
      ))}
    </sup>
  );
}
