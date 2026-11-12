'use client';

import Image from 'next/image';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { AppTile } from '@/components/cuppi/feature-icon';
import { useAssetsReady } from '@/lib/use-assets-ready';
import type { Feature } from '@/lib/features-types';

type Tile = Pick<Feature, 'slug' | 'name' | 'iconUrl' | 'icon' | 'tile'>;

/**
 * Cuppi's own icon on its own, until the visitor scrolls it into view. Then the in-app
 * icons slide out of it to the left and right, the closest ones first, and settle.
 *
 * Icons take turns going right then left, so each side gets a mix. The layout is two
 * different arrangements of the same eight icons (see `.fan` in globals.css): one row
 * of nine on a wide screen; on a phone, Cuppi with two icons either side and the other
 * four tucked in a second row below. Positions are numbers in the icon's own units (set
 * as CSS variables here), and the stylesheet scales the units to the width available.
 *
 * It opens either when scrolled into view (`when="scroll"`, for a block lower on the page) or,
 * for one at the top of a page, once everything it needs has downloaded (`when="loaded"`;
 * `waitFor` lists extra pictures to wait for, such as the hero's pattern).
 *
 * It plays once. If JavaScript never starts, CSS shows the icons after 6 seconds, and
 * people who prefer reduced motion see them already in place.
 */
export function AppFan({
  features,
  when = 'scroll',
  waitFor = [],
}: {
  features: Tile[];
  when?: 'scroll' | 'loaded';
  waitFor?: string[];
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [scrolledIn, setScrolledIn] = useState(false);
  const loaded = useAssetsReady(ref, waitFor);
  const open = when === 'loaded' ? loaded : scrolledIn;

  useEffect(() => {
    const el = ref.current;
    if (!el || when !== 'scroll') return;
    if (typeof IntersectionObserver === 'undefined') {
      setScrolledIn(true);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        // Also open when it has already been scrolled past (a jump straight to a lower part of the page).
        if (entry.isIntersecting || entry.boundingClientRect.bottom < 0) {
          setScrolledIn(true);
          io.disconnect();
        }
      },
      { threshold: 0.6, rootMargin: '0px 0px -12% 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [when]);

  return (
    <div className="fan mx-auto w-full max-w-[60rem]" aria-hidden>
      <div ref={ref} className="fan-stage" data-fan={open ? 'open' : 'closed'}>
        <div className="fan-cuppi">
          <Image
            src="/icons/Cuppi-Mar26-v1-iOS-Default-1024x1024@1x.png"
            alt=""
            width={256}
            height={256}
            sizes="(max-width: 640px) 80px, 128px"
            priority
            className="h-full w-full"
          />
        </div>
        {features.map((f, i) => {
          const side = i % 2 === 0 ? 1 : -1; // right, left, right, left...
          const k = Math.floor(i / 2) + 1; // 1 is the closest to Cuppi
          // Phone: k 1-2 in the first row beside Cuppi, k 3-4 in a second row below it.
          const second = k > 2;
          const style = {
            '--k': k,
            '--dx': side * (124 + (k - 1) * 104),
            '--mx': side * (second ? 33 + (k - 3) * 66 : 78 + (k - 1) * 66),
            '--my': second ? 92 : 12,
          } as CSSProperties;
          return (
            <div key={f.slug} className="fan-icon" style={style}>
              <AppTile feature={f} className="h-full w-full" />
            </div>
          );
        })}
      </div>
    </div>
  );
}
