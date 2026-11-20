import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Banner } from '@/lib/banners';
import { isExternal } from '@/lib/menu-settings';
import { TINTS } from './blocks/tints';

/**
 * A temporary notice just under the menu (see src/lib/banners.ts for how one is chosen and scheduled). It is the
 * menu's width and rounded the same way, so it reads as part of the header, in one of the five brand tints.
 * With a link the whole banner is the link; without one it is plain text.
 *
 * It is not sticky: the menu stays at the top as the page scrolls and the banner scrolls away beneath it.
 */
export function SiteBanner({ banner }: { banner: Banner }) {
  const t = TINTS[banner.colour];
  const inner = (
    <>
      {banner.iconUrl && (
        // Admin uploads live in our own storage bucket, which next/image is configured for (checked again in resolveBanners).
        <Image src={banner.iconUrl} alt="" width={28} height={28} priority className="h-7 w-7 shrink-0 object-contain" />
      )}
      <span className="text-center text-[0.95rem] font-medium leading-snug">{banner.text}</span>
      {banner.href && <ArrowRight className="h-4 w-4 shrink-0 transition-transform duration-300 group-hover:translate-x-1" aria-hidden />}
    </>
  );
  const shape = cn('flex items-center justify-center gap-3 rounded-[1.75rem] px-5 py-2.5', t.surface, t.text);
  return (
    <aside data-nosnippet aria-label="Announcement" className="cuppi-fade-up px-3 pt-2 sm:px-6">
      <div className="mx-auto max-w-6xl">
        {banner.href ? (
          <Link
            href={banner.href}
            {...(isExternal(banner.href) ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
            className={cn(shape, 'group transition-opacity hover:opacity-90')}
          >
            {inner}
          </Link>
        ) : (
          <div className={shape}>{inner}</div>
        )}
      </div>
    </aside>
  );
}
