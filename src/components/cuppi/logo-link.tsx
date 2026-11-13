'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState, type CSSProperties } from 'react';
import { CUPPI_LOGO } from '@/lib/brand-assets';
import { cn } from '@/lib/utils';

// Logos already pulled out during this visit. Module scope, so it survives moving between pages (the
// header is rebuilt on each page, and would otherwise tuck the name away again).
const pulledOut = new Set<string>();

/**
 * Cuppi's logo, as a link home. On a device with a mouse the name is tucked away behind the logo;
 * hovering the logo slowly slides it out, starting in Cuppi orange and settling to the text colour,
 * and there it stays for the rest of the visit. Touch screens have no hover, so there the name is
 * simply always shown. The motion is CSS (the `.cuppi-logo` block in globals.css, which also does the
 * reveal on hover or keyboard focus by itself); the small state here is only the memory of having
 * been hovered. The name's space is always reserved, so nothing around it moves when it appears.
 *
 * The link's label says the full name, so the visible name is hidden from screen readers.
 */
export function CuppiLogoLink({
  id,
  iconWidth,
  iconHeight,
  className,
  textClassName,
  priority,
}: {
  /** Tells the header's logo from the footer's, so each is remembered separately. */
  id: string;
  iconWidth: number;
  iconHeight: number;
  className?: string;
  textClassName?: string;
  /** Load the logo straight away (it is at the very top of the page). */
  priority?: boolean;
}) {
  // How far the name starts behind the logo: most of the logo's width, plus the gap beside it.
  const reach = Math.round(iconWidth * 0.7 + 12);
  const [out, setOut] = useState(() => pulledOut.has(id));
  return (
    <Link href="/" aria-label="Cuppi Home, home page" className={cn('cuppi-logo', className)} style={{ '--reach': `${reach}px` } as CSSProperties} data-out={out || undefined}>
      <Image src={CUPPI_LOGO} alt="" width={iconWidth} height={iconHeight} priority={priority}
        className="logo-mark"
        onPointerEnter={(e) => {
          if (e.pointerType === 'touch') return;
          pulledOut.add(id);
          setOut(true);
        }}
      />
      <span className="logo-name" aria-hidden>
        <span className={cn('logo-name-text whitespace-nowrap font-headline font-normal', textClassName)}>Cuppi Home</span>
      </span>
    </Link>
  );
}
