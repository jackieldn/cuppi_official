'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Reveal } from '@/components/ui/reveal';
import { cn } from '@/lib/utils';
import { KIND_PLURAL, sortApps, type App, type AppKind } from '@/lib/showcase';
import { AppCard } from './app-card';

interface AppGalleryProps {
  apps: App[] | null;
  isLoading?: boolean;
}

type Filter = 'all' | AppKind;
const GROUPS: AppKind[] = ['app', 'website'];

export function AppGallery({ apps, isLoading }: AppGalleryProps) {
  const [filter, setFilter] = useState<Filter>('all');

  const sorted = useMemo(() => sortApps(apps ?? []), [apps]);
  const counts = useMemo(
    () => ({ all: sorted.length, app: sorted.filter((a) => a.kind === 'app').length, website: sorted.filter((a) => a.kind === 'website').length }),
    [sorted]
  );
  // Only offer a filter when there's something to filter between.
  const showFilter = counts.app > 0 && counts.website > 0;
  const visibleGroups = GROUPS.filter((kind) => (filter === 'all' || filter === kind) && counts[kind] > 0);

  return (
    <section className="py-24 sm:py-32">
      <div className="container mx-auto px-4">
        <Reveal className="mx-auto max-w-3xl">
          <h1 className="font-headline text-5xl font-bold tracking-tight text-accent sm:text-6xl">
            Apps & Websites
          </h1>
          <div className="mt-8 space-y-6 text-lg leading-8 text-foreground/80">
            <p>
              Here are some of the applications and websites I've built. Some are personal projects, others were for clients.
            </p>
          </div>
        </Reveal>

        {showFilter && (
          <div className="mt-16 flex flex-wrap justify-center gap-2">
            {(['all', 'app', 'website'] as const).map((value) => (
              <Button
                key={value}
                variant={filter === value ? 'default' : 'outline'}
                onClick={() => setFilter(value)}
                className={cn('rounded-full transition-all', filter === value && 'bg-primary text-primary-foreground')}
              >
                {value === 'all' ? 'All' : KIND_PLURAL[value]}
                <span className="ml-2 text-xs tabular-nums opacity-70">{counts[value]}</span>
              </Button>
            ))}
          </div>
        )}

        {/* No placeholder boxes while loading: the page is empty, then the cards fade up. */}
        {!isLoading && sorted.length === 0 && (
          <p className="mt-16 text-center text-muted-foreground">Nothing here yet. Check back soon.</p>
        )}

        <div className={cn('space-y-20', showFilter ? 'mt-14' : 'mt-16')}>
          {!isLoading &&
            visibleGroups.map((kind) => (
              <div key={kind}>
                {/* The headings only earn their place when both kinds are on show. */}
                {visibleGroups.length > 1 && (
                  <Reveal>
                    <h2 className="mb-8 font-headline text-2xl font-bold text-palette-sage sm:text-3xl">
                      {KIND_PLURAL[kind]}
                    </h2>
                  </Reveal>
                )}
                <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
                  {sorted
                    .filter((a) => a.kind === kind)
                    .map((app) => (
                      <Reveal key={app.id} stagger={90} className="h-full">
                        <AppCard app={app} />
                      </Reveal>
                    ))}
                </div>
              </div>
            ))}
        </div>
      </div>
    </section>
  );
}
