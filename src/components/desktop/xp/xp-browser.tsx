'use client';

// The browser window's insides: a toolbar where every button works (Back,
// Forward, Refresh, Home), the page, and a status bar.

import { useEffect, useRef, useState } from 'react';

import { cn } from '@/lib/utils';
import { usePortalData } from './portal-data';
import { PAGE_TITLES, PortalError, PortalLoading, PortalSite, type PortalPage, type PortalRoute } from './portal-site';
import { ArrowIcon, GlobeSmall, HomeIcon, RefreshIcon } from './xp-icons';
import styles from './xp.module.css';

// Pages "load" for a moment, as they did on a 2006 connection.
const LOAD_MS = 450;

export const browserTitle = (page: PortalPage, projectTitle?: string) =>
  `${page === 'home' ? "Jackie's portal" : projectTitle || PAGE_TITLES[page]} - Internet`;

interface XpBrowserProps {
  travel: (href: string) => void;
  now: Date;
  /** The page being shown, with the work's title when it's a project. */
  onPage: (page: PortalPage, projectTitle?: string) => void;
}

export function XpBrowser({ travel, now, onPage }: XpBrowserProps) {
  const { data, failed, retry } = usePortalData();
  const [history, setHistory] = useState<PortalRoute[]>([{ page: 'home' }]);
  const [at, setAt] = useState(0);
  const [loading, setLoading] = useState(true);
  const viewportRef = useRef<HTMLDivElement>(null);
  const route = history[at];
  const { page, slug } = route;
  const onPageRef = useRef(onPage);
  onPageRef.current = onPage;

  const load = () => {
    setLoading(true);
    setTimeout(() => setLoading(false), LOAD_MS);
  };

  const projectTitle = page === 'project' ? data?.projects.find((p) => p.slug === slug)?.title.trim() : undefined;

  useEffect(() => {
    onPageRef.current(page, projectTitle);
  }, [page, projectTitle]);

  useEffect(() => {
    viewportRef.current?.scrollTo({ top: 0 });
    setLoading(true);
    const t = setTimeout(() => setLoading(false), LOAD_MS);
    return () => clearTimeout(t);
  }, [page, slug]);

  const go = (next: PortalPage, nextSlug?: string) => {
    if (next === page && nextSlug === slug) return;
    setHistory((h) => [...h.slice(0, at + 1), { page: next, slug: nextSlug }]);
    setAt((i) => i + 1);
  };

  const busy = loading || (!data && !failed);

  return (
    <>
      <div className={styles.toolbar}>
        <button type="button" className={styles.toolButton} disabled={at === 0} onClick={() => setAt((i) => i - 1)}>
          <ArrowIcon dir="left" />
          Back
        </button>
        <button
          type="button"
          className={styles.toolButton}
          aria-label="Forward"
          disabled={at === history.length - 1}
          onClick={() => setAt((i) => i + 1)}
        >
          <ArrowIcon dir="right" />
        </button>
        <button
          type="button"
          className={cn(styles.toolButton, styles.toolSmall)}
          onClick={() => {
            if (failed) retry();
            load();
          }}
        >
          <RefreshIcon />
          Refresh
        </button>
        <button type="button" className={cn(styles.toolButton, styles.toolSmall)} onClick={() => go('home')}>
          <HomeIcon />
          Home
        </button>
      </div>

      <div ref={viewportRef} className={styles.viewport}>
        {failed ? (
          <PortalError onRetry={retry} />
        ) : !data ? (
          <PortalLoading />
        ) : (
          <PortalSite data={data} page={page} slug={slug} go={go} travel={travel} now={now} />
        )}
      </div>

      <div className={styles.statusBar}>
        <span className={styles.statusCell}>
          <GlobeSmall width={14} height={14} />
          {failed ? 'Error on page.' : busy ? 'Opening page...' : 'Done'}
        </span>
      </div>
    </>
  );
}
