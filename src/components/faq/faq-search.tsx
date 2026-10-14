'use client';

import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { buildSearchIndex, searchFaq, type SearchDoc, type SearchIndex } from '@/lib/faq-search';
import { Highlight } from '@/components/faq/highlight';

const INDEX_URL = '/faq/search-index.json';
const MAX_SUGGESTIONS = 6;

// Fetched on first use and shared by every search box on the page.
let indexPromise: Promise<SearchIndex> | null = null;
function loadIndex(): Promise<SearchIndex> {
  if (!indexPromise) {
    indexPromise = fetch(INDEX_URL)
      .then((res) => {
        if (!res.ok) throw new Error(`Search index returned ${res.status}`);
        return res.json() as Promise<SearchDoc[]>;
      })
      .then(buildSearchIndex)
      .catch((error) => {
        indexPromise = null; // try again on the next focus
        throw error;
      });
  }
  return indexPromise;
}

type Props = {
  placeholder: string;
  size?: 'large' | 'compact';
  defaultValue?: string;
};

/**
 * Search box with instant suggestions. It is a plain GET form first: with no
 * JavaScript, or if the index fails to load, Enter opens /faq/search?q=… which
 * the server answers. Suggestions are an enhancement on top.
 */
export function FaqSearch({ placeholder, size = 'large', defaultValue = '' }: Props) {
  const router = useRouter();
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState(defaultValue);
  const [index, setIndex] = useState<SearchIndex | null>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);

  const outcome = useMemo(() => (index && query.trim() ? searchFaq(index, query, 50) : null), [index, query]);
  const suggestions = outcome?.results.slice(0, MAX_SUGGESTIONS) ?? [];
  const total = outcome?.results.length ?? 0;
  const expanded = open && outcome !== null;
  // The last row ("See all results") sits after the suggestions.
  const rowCount = suggestions.length + (total > 0 ? 1 : 0);

  const ensureIndex = () => {
    loadIndex().then(setIndex).catch(() => {});
  };

  // "/" jumps to the search box, as on most documentation sites.
  useEffect(() => {
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key !== '/' || event.metaKey || event.ctrlKey || event.altKey) return;
      const el = event.target as HTMLElement | null;
      if (el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))) return;
      event.preventDefault();
      inputRef.current?.focus();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const goTo = (doc: SearchDoc) => {
    setOpen(false);
    const path = `/faq/${doc.sectionId}`;
    if (window.location.pathname === path) {
      // Already on that page: change the hash natively so the page opens the answer.
      if (window.location.hash === `#${doc.slug}`) window.dispatchEvent(new HashChangeEvent('hashchange'));
      else window.location.hash = doc.slug;
    } else {
      router.push(`${path}#${doc.slug}`);
    }
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      if (!expanded || rowCount === 0) return;
      event.preventDefault();
      setActive((i) => (event.key === 'ArrowDown' ? (i + 1) % rowCount : i <= 0 ? rowCount - 1 : i - 1));
    } else if (event.key === 'Enter') {
      // On a suggestion: open it. Otherwise let the form submit to the results page.
      if (expanded && active >= 0 && active < suggestions.length) {
        event.preventDefault();
        goTo(suggestions[active].doc);
      }
    } else if (event.key === 'Escape') {
      if (open) setOpen(false);
      else if (query) setQuery('');
    }
  };

  const activeId = expanded && active >= 0 ? `${listId}-${active}` : undefined;

  return (
    <div
      className="relative"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false);
      }}
    >
      <form action="/faq/search" method="get" role="search" onSubmit={() => setOpen(false)}>
        <div
          className={cn(
            'flex items-center gap-3 border-foreground bg-card px-4 focus-within:border-primary focus-within:ring-4 focus-within:ring-secondary',
            size === 'large' ? 'min-h-14 rounded-2xl border-2' : 'min-h-11 rounded-xl border',
          )}
        >
          <button type="submit" aria-label="Search the FAQ" className="text-muted-foreground hover:text-primary">
            <Search className={size === 'large' ? 'h-5 w-5' : 'h-4 w-4'} aria-hidden="true" />
          </button>
          <input
            ref={inputRef}
            type="search"
            name="q"
            value={query}
            placeholder={placeholder}
            aria-label="Search the FAQ"
            autoComplete="off"
            spellCheck={false}
            enterKeyHint="search"
            role="combobox"
            aria-expanded={expanded}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={activeId}
            onChange={(event) => {
              setQuery(event.target.value);
              setActive(-1);
              setOpen(true);
              ensureIndex();
            }}
            onFocus={() => {
              ensureIndex();
              if (query.trim()) setOpen(true);
            }}
            onKeyDown={onKeyDown}
            className={cn(
              'min-w-0 flex-1 bg-transparent font-medium text-foreground outline-none placeholder:text-muted-foreground',
              size === 'large' ? 'py-3.5 text-base sm:text-lg' : 'py-2.5 text-base',
            )}
          />
          {size === 'large' && (
            <kbd aria-hidden="true" className="hidden rounded border bg-background px-1.5 text-xs text-muted-foreground sm:inline-block">
              /
            </kbd>
          )}
        </div>
      </form>

      <div
        id={listId}
        role="listbox"
        aria-label="Matching answers"
        hidden={!expanded}
        className="absolute left-0 right-0 top-full z-30 mt-2 max-h-[min(28rem,70vh)] overflow-auto rounded-2xl border bg-card p-1.5 shadow-xl"
      >
        {expanded && total === 0 && (
          <p className="px-3 py-3 text-sm text-muted-foreground">
            No answers match “{query.trim()}”. Try fewer or simpler words, or press Enter to search again.
          </p>
        )}
        {expanded &&
          suggestions.map(({ doc }, i) => (
            <Link
              key={doc.slug}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              href={`/faq/${doc.sectionId}#${doc.slug}`}
              onMouseDown={(event) => event.preventDefault()}
              onMouseEnter={() => setActive(i)}
              onClick={(event) => {
                event.preventDefault();
                goTo(doc);
              }}
              className="flex flex-col gap-0.5 rounded-xl px-3 py-2.5 aria-selected:bg-secondary"
            >
              <span className="font-semibold">
                <Highlight text={doc.question} terms={outcome?.terms ?? []} />
              </span>
              <span className="text-xs text-muted-foreground">
                {doc.sectionLabel}
                {doc.topic ? ` › ${doc.topic}` : ''}
              </span>
            </Link>
          ))}
        {expanded && total > 0 && (
          <Link
            id={`${listId}-${suggestions.length}`}
            role="option"
            aria-selected={active === suggestions.length}
            href={`/faq/search?q=${encodeURIComponent(query.trim())}`}
            rel="nofollow"
            prefetch={false}
            onMouseDown={(event) => event.preventDefault()}
            onMouseEnter={() => setActive(suggestions.length)}
            onClick={() => setOpen(false)}
            className="mt-1 block rounded-xl border-t px-3 py-2.5 text-sm font-semibold text-primary aria-selected:bg-secondary"
          >
            See all {total} {total === 1 ? 'result' : 'results'} →
          </Link>
        )}
      </div>
    </div>
  );
}
