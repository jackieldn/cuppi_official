'use client';

import { usePathname } from 'next/navigation';

// A ~50px arch of light along the bottom of the page. It is fixed to the bottom of
// whatever frames the page: the screen in full-screen mode, or the page window (which
// contains fixed children). It used to be a sticky rail after the content, but on a
// page that was still loading, and so shorter than the screen, that left the glow
// floating mid-page until the content arrived and pushed it down. Styles live in
// globals.css.
export function BottomGlow() {
  const pathname = usePathname();
  if (pathname.startsWith('/admin')) return null;

  return (
    <div
      aria-hidden="true"
      className="bottom-glow pointer-events-none fixed inset-x-0 bottom-0 z-30 h-[50px] overflow-hidden"
    >
      <div className="bottom-glow__layer bottom-glow__base" />
      <div className="bottom-glow__layer bottom-glow__ocean" />
      <div className="bottom-glow__layer bottom-glow__amber" />
      <div className="bottom-glow__layer bottom-glow__cream" />
      <div className="bottom-glow__layer bottom-glow__hot" />
      <div className="bottom-glow__layer bottom-glow__streak" />
    </div>
  );
}
