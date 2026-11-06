import Image from 'next/image';
import { cn } from '@/lib/utils';
import { aspectOf, type AppKind, type ShowcaseImage } from '@/lib/showcase';

interface DeviceFrameProps {
  /** App screenshots sit in a phone, website screenshots in a browser window. */
  kind: AppKind;
  image: ShowcaseImage;
  alt: string;
  /** The address shown in the browser's bar. */
  host?: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
}

const BEZEL = 'bg-[#0a1519] ring-1 ring-white/15 shadow-2xl';

/**
 * A screenshot in a device: a phone for apps, a browser window for websites. The frame
 * wraps the picture at its own proportions (nothing is cropped), so any screenshot
 * works without the admin having to match a size. Pure CSS: no frame artwork to maintain.
 */
export function DeviceFrame({ kind, image, alt, host, className, sizes, priority }: DeviceFrameProps) {
  const ratio = aspectOf(image);

  if (kind === 'website') {
    return (
      <div className={cn('overflow-hidden rounded-xl', BEZEL, className)}>
        <div className="flex h-7 items-center gap-1.5 bg-white/[0.06] px-3">
          <span className="h-2 w-2 rounded-full bg-[#ff5f57]/80" />
          <span className="h-2 w-2 rounded-full bg-[#febc2e]/80" />
          <span className="h-2 w-2 rounded-full bg-[#28c840]/80" />
          <span className="mx-auto max-w-[60%] flex-1 truncate rounded bg-black/30 px-3 py-0.5 text-center text-[10px] leading-4 text-white/55">
            {host || ' '}
          </span>
          <span className="w-[42px]" aria-hidden="true" />
        </div>
        <div className="relative w-full" style={{ aspectRatio: ratio }}>
          <Image src={image.url} alt={alt} fill sizes={sizes} priority={priority} className="object-cover" />
        </div>
      </div>
    );
  }

  // Only portrait screenshots get a phone's island; an iPad or Mac screenshot would look odd with one.
  const isPhone = ratio < 0.75;
  return (
    <div className={cn('rounded-[2.1rem] p-[6px]', BEZEL, className)}>
      <div className="relative overflow-hidden rounded-[1.7rem]" style={{ aspectRatio: ratio }}>
        <Image src={image.url} alt={alt} fill sizes={sizes} priority={priority} className="object-cover" />
        {isPhone && (
          <span
            aria-hidden="true"
            className="absolute left-1/2 top-[1.8%] h-[2.2%] w-[27%] -translate-x-1/2 rounded-full bg-black"
          />
        )}
      </div>
    </div>
  );
}
