import Image from 'next/image';
import type { CSSProperties } from 'react';
import { cn } from '@/lib/utils';
import { aspectOf, FALLBACK_ICON_COLOR, type AppKind, type ShowcaseImage } from '@/lib/showcase';

// The portfolio's ink: what the icon's colour is mixed into, so any colour (even a near-white
// or a neon) leaves the text on top of it readable.
const INK = '#0b2027';

const colourOf = (colour: string) => colour || FALLBACK_ICON_COLOR;

/** The card's backdrop: the icon's colour, lit from the top and sinking into the dark. */
export function stageBackground(colour: string): string {
  const c = colourOf(colour);
  return `radial-gradient(120% 110% at 50% 0%, color-mix(in srgb, ${c} 80%, ${INK}) 0%, color-mix(in srgb, ${c} 36%, ${INK}) 100%)`;
}

/** A soft wash of the icon's colour that fades out downwards: the top of a detail page. */
export function pageWash(colour: string): string {
  const c = colourOf(colour);
  return `radial-gradient(75% 80% at 30% 0%, color-mix(in srgb, ${c} 42%, transparent) 0%, transparent 100%)`;
}

/** The colour as a glow beneath the icon. */
export function iconGlow(colour: string, spread = 70): CSSProperties {
  return { boxShadow: `0 28px ${spread}px -14px color-mix(in srgb, ${colourOf(colour)} 85%, transparent)` };
}

interface IconMarkProps {
  kind: AppKind;
  icon: ShowcaseImage;
  alt?: string;
  /** Tailwind size for an app icon (a square), or the longest side of a website's logo. */
  className?: string;
  sizes?: string;
  priority?: boolean;
  style?: CSSProperties;
}

/**
 * An app icon in iOS's rounded-square shape, or a website's logo at its own proportions.
 * Size it with `className` (`h-28 w-28` for an icon; `max-h-24 max-w-[60%]` for a logo).
 */
export function IconMark({ kind, icon, alt = '', className, sizes, priority, style }: IconMarkProps) {
  if (kind === 'app') {
    return (
      <div className={cn('relative aspect-square overflow-hidden rounded-[22.5%] ring-1 ring-white/15', className)} style={style}>
        <Image src={icon.url} alt={alt} fill sizes={sizes} priority={priority} className="object-cover" />
      </div>
    );
  }
  // A logo can be any shape; it is shown whole, never cropped.
  return (
    <div
      className={cn('relative w-auto overflow-hidden rounded-xl ring-1 ring-white/15', className)}
      style={{ aspectRatio: aspectOf(icon), ...style }}
    >
      <Image src={icon.url} alt={alt} fill sizes={sizes} priority={priority} className="object-contain" />
    </div>
  );
}
