'use client';

import { usePathname } from 'next/navigation';

// A ~50px arch of light along the bottom of the page. A zero-height sticky rail
// keeps it pinned to the bottom of whatever scrolls (the window's scroller or the
// page itself) without taking up layout space. Styles live in globals.css.
export function BottomGlow() {
  const pathname = usePathname();
  if (pathname.startsWith('/admin')) return null;

  return (
    <div aria-hidden="true" className="pointer-events-none sticky bottom-0 z-30 h-0">
      <div className="bottom-glow absolute inset-x-0 bottom-0 h-[50px] overflow-hidden">
        <div className="bottom-glow__layer bottom-glow__base" />
        <div className="bottom-glow__layer bottom-glow__ocean" />
        <div className="bottom-glow__layer bottom-glow__amber" />
        <div className="bottom-glow__layer bottom-glow__cream" />
      </div>
    </div>
  );
}
