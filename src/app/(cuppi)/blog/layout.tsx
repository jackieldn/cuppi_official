import type { Metadata } from 'next';
import { SectionGate, refreshMetadata } from '@/components/cuppi/section-gate';

// This section can be switched to "refresh in progress" in the admin (Cuppi pages). The status is
// read on the server, so the page is re-checked every minute like the rest of the site.
export const revalidate = 60;

export const generateMetadata = (): Promise<Metadata> => refreshMetadata('blog');

export default function Layout({ children }: { children: React.ReactNode }) {
  return <SectionGate section="blog">{children}</SectionGate>;
}
