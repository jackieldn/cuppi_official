'use client';

import { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { ArrowDown, ArrowUp, Loader2, Plus, Search, X } from 'lucide-react';
import { listContentChoices, loadFeatureContent, type ContentChoices } from '@/app/actions/feature-content';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { contentIds, NO_CONTENT, type FeatureContent } from '@/lib/feature-content-types';
import type { FeatureBlock } from '@/lib/features-types';

// The page builder runs in the browser and Sanity's content is read on the server, so both go through server
// actions (src/app/actions/feature-content.ts).

// The list of what can be picked is the same for every section on the page, so it is fetched once and kept. A failed
// fetch is not kept, so "Try again" really tries again.
let choicesLoad: Promise<ContentChoices | null> | null = null;
const loadChoices = (fresh = false): Promise<ContentChoices | null> => {
  if (fresh || !choicesLoad) {
    choicesLoad = listContentChoices()
      .catch(() => null)
      .then((c) => {
        if (!c) choicesLoad = null;
        return c;
      });
  }
  return choicesLoad;
};

type Choices = { status: 'loading' } | { status: 'failed' } | { status: 'ready'; choices: ContentChoices };

function useChoices(): { state: Choices; retry: () => void } {
  const [state, setState] = useState<Choices>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let live = true;
    setState({ status: 'loading' });
    void loadChoices(attempt > 0).then((choices) => {
      if (live) setState(choices ? { status: 'ready', choices } : { status: 'failed' });
    });
    return () => {
      live = false;
    };
  }, [attempt]);
  return { state, retry: () => setAttempt((n) => n + 1) };
}

/**
 * What the preview needs to draw the Articles and FAQs sections of the draft: looked up again whenever the ids
 * the draft points at change, and nothing else. Until the answer arrives the last one stays on screen.
 */
export function usePreviewContent(blocks: FeatureBlock[]): FeatureContent {
  const key = JSON.stringify(contentIds(blocks));
  const [content, setContent] = useState<FeatureContent>(NO_CONTENT);
  useEffect(() => {
    const wanted = JSON.parse(key) as { articles: string[]; faqs: string[] };
    if (wanted.articles.length === 0 && wanted.faqs.length === 0) {
      setContent(NO_CONTENT);
      return;
    }
    let live = true;
    loadFeatureContent(wanted)
      .then((c) => live && setContent(c))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [key]);
  return content;
}

type Option = { id: string; title: string; note: string };

const toOptions = (kind: 'articles' | 'faqs', choices: ContentChoices): Option[] =>
  kind === 'articles'
    ? choices.articles.map((a) => ({ id: a.id, title: a.title, note: format(new Date(a.date), 'd MMM yyyy') }))
    : choices.faqs.map((f) => ({ id: f.id, title: f.question, note: f.section }));

/**
 * Picks articles or FAQs from Sanity: what is chosen so far (in the order the page shows them, with move and remove
 * buttons), then a search box over everything else. Stores only the Sanity ids.
 */
export function ContentPicker({ kind, ids, onChange, max }: { kind: 'articles' | 'faqs'; ids: string[]; onChange: (ids: string[]) => void; max: number }) {
  const { state, retry } = useChoices();
  const [query, setQuery] = useState('');
  const noun = kind === 'articles' ? 'article' : 'question';
  const options = useMemo(() => (state.status === 'ready' ? toOptions(kind, state.choices) : []), [state, kind]);
  const byId = useMemo(() => new Map(options.map((o) => [o.id, o])), [options]);

  const q = query.trim().toLowerCase();
  const available = options.filter((o) => !ids.includes(o.id) && (!q || `${o.title} ${o.note}`.toLowerCase().includes(q)));
  const full = ids.length >= max;

  const move = (i: number, by: number) => {
    const next = [...ids];
    const [x] = next.splice(i, 1);
    next.splice(i + by, 0, x);
    onChange(next);
  };

  return (
    <div className="space-y-3">
      {ids.length === 0 ? (
        <p className="rounded-lg border border-dashed p-3 text-center text-sm text-muted-foreground">No {noun}s chosen yet.</p>
      ) : (
        <ol className="space-y-1.5">
          {ids.map((id, i) => {
            const option = byId.get(id);
            // Still loading, so the title is not known yet; or the item was deleted or hidden in Sanity.
            const gone = state.status === 'ready' && !option;
            return (
              <li key={id} className="flex items-center gap-1 rounded-lg border bg-background py-1 pl-3 pr-1">
                <span className="min-w-0 flex-1">
                  <span className={gone ? 'block truncate text-sm italic text-destructive' : 'block truncate text-sm font-medium'}>
                    {option?.title ?? (gone ? `No longer in Sanity (${id.slice(0, 8)}…)` : 'Loading…')}
                  </span>
                  {option && <span className="block truncate text-xs text-muted-foreground">{option.note}</span>}
                </span>
                <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" aria-label={`Move ${noun} ${i + 1} up`} disabled={i === 0} onClick={() => move(i, -1)}>
                  <ArrowUp className="h-4 w-4" />
                </Button>
                <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" aria-label={`Move ${noun} ${i + 1} down`} disabled={i === ids.length - 1} onClick={() => move(i, 1)}>
                  <ArrowDown className="h-4 w-4" />
                </Button>
                <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-destructive hover:text-destructive" aria-label={`Remove ${noun} ${i + 1}`} onClick={() => onChange(ids.filter((x) => x !== id))}>
                  <X className="h-4 w-4" />
                </Button>
              </li>
            );
          })}
        </ol>
      )}

      <div className="space-y-2 rounded-lg border bg-background p-3">
        {state.status === 'loading' && (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Loading {noun}s from Sanity…
          </p>
        )}
        {state.status === 'failed' && (
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span className="text-destructive">Could not reach Sanity to list the {noun}s.</span>
            <Button type="button" variant="outline" size="sm" onClick={retry}>
              Try again
            </Button>
          </div>
        )}
        {state.status === 'ready' && (
          <>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <Input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={full ? `Up to ${max} ${noun}s` : `Search ${options.length} ${noun}s`}
                aria-label={`Search ${noun}s to add`}
                disabled={full}
                className="pl-9"
              />
            </div>
            {full ? (
              <p className="text-xs text-muted-foreground">
                That is the most a section can hold ({max}). Remove one to add another.
              </p>
            ) : available.length === 0 ? (
              <p className="text-sm text-muted-foreground">{q ? `No ${noun}s match “${query.trim()}”.` : `Every ${noun} is already chosen.`}</p>
            ) : (
              <ul className="max-h-60 space-y-1 overflow-y-auto pr-1">
                {available.map((o) => (
                  <li key={o.id}>
                    <button
                      type="button"
                      onClick={() => {
                        onChange([...ids, o.id]);
                        setQuery('');
                      }}
                      className="flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <Plus className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                      <span className="min-w-0">
                        <span className="block">{o.title}</span>
                        <span className="block text-xs text-muted-foreground">{o.note}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </div>
  );
}
