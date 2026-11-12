import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { getPageStatus } from '@/lib/cuppi-site-data';
import { isLive, type SectionKey } from '@/lib/page-status';
import { RefreshInProgress } from './refresh-in-progress';

/** The "refresh in progress" page for a section that is switched off, or null when it is live. */
export async function refreshPage(section: SectionKey): Promise<React.JSX.Element | null> {
  const status = await getPageStatus();
  return isLive(status, section) ? null : <RefreshInProgress section={section} status={status} />;
}

/** Wraps a section's routes (used in its layout): shows them when live, the refresh page when not. */
export async function SectionGate({ section, children }: { section: SectionKey; children: ReactNode }): Promise<React.JSX.Element> {
  return (await refreshPage(section)) ?? <>{children}</>;
}

/** Keeps a section out of search results while it shows the refresh page. */
export async function refreshMetadata(section: SectionKey): Promise<Metadata> {
  return isLive(await getPageStatus(), section) ? {} : { robots: { index: false, follow: true } };
}
