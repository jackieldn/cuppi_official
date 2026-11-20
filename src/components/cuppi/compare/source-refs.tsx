import { numberSources, type CompareContent, type Source } from '@/lib/compare-data';

/** How a claim points at its source: the page's numbering, and the sources it numbers. Built once per page from its content. */
export type Cite = { numbers: Map<string, number>; sources: Source[] };

export const makeCite = (content: CompareContent): Cite => ({ numbers: numberSources(content), sources: content.sources });

/**
 * The small numbers beside a claim, each linking down to its source in the list at the foot of the page. A source the list
 * doesn't have (a stale key) is left out rather than shown as a number that leads nowhere.
 */
export function SourceRefs({ ids, cite, onDark }: { ids?: string[]; cite: Cite; onDark?: boolean }) {
  const refs = (ids ?? []).flatMap((id) => {
    const n = cite.numbers.get(id);
    return n ? [{ id, n }] : [];
  });
  if (refs.length === 0) return null;
  return (
    <sup className="ml-0.5 whitespace-nowrap text-[0.7em] font-semibold">
      {refs.map(({ id, n }, i) => (
        <a
          key={id}
          href={`#source-${n}`}
          aria-label={`Source ${n}: ${cite.sources.find((s) => s.id === id)?.label ?? ''}`}
          className={`rounded px-[1px] underline-offset-2 hover:underline ${onDark ? 'text-cuppi-cream' : 'text-cuppi-brand-deep'}`}
        >
          {i > 0 && <span aria-hidden>,</span>}
          {n}
        </a>
      ))}
    </sup>
  );
}
