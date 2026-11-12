import Image from 'next/image';
import { cn } from '@/lib/utils';
import type { FeatureImage } from '@/lib/features-types';

/**
 * A phone screenshot that rises out of the bottom edge of its parent. The parent
 * must be `relative overflow-hidden`. The screenshots are transparent PNG/WebP
 * crops (half a phone, or a whole one), so they sit straight on a colour with no
 * frame of our own. `sink` pushes a whole phone a little further down so its
 * bottom bezel is cropped like the half-phone ones.
 */
export function Phone({
  image,
  sizes,
  priority,
  sink = 0,
  scale = 100,
  className,
}: {
  image: FeatureImage;
  sizes: string;
  priority?: boolean;
  sink?: number;
  /** Height as a percentage of the parent. 100 fits the card exactly. */
  scale?: number;
  className?: string;
}) {
  // A photograph just fills the space; only phone crops need the rising-from-the-bottom treatment.
  if (image.fit === 'photo') {
    return (
      <div className={cn('absolute inset-0', className)}>
        <Image src={image.url} alt={image.alt} fill sizes={sizes} priority={priority} className="object-cover" />
      </div>
    );
  }

  // Sized by the parent's HEIGHT (a square as tall as the card), so the phone
  // always fits vertically and its notch is never clipped, whatever the width.
  return (
    <div
      className={cn('absolute bottom-0 left-1/2 aspect-square', className)}
      style={{ height: `${scale}%`, transform: `translate(-50%, ${sink}%)` }}
    >
      <Image
        src={image.url}
        alt={image.alt}
        width={1000}
        height={1000}
        sizes={sizes}
        priority={priority}
        className="h-full w-full select-none drop-shadow-[0_24px_30px_rgba(43,33,24,0.18)]"
      />
    </div>
  );
}
