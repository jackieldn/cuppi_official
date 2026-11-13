import Image from 'next/image';
import { cn } from '@/lib/utils';
import {
  MOCKUPS,
  OVERSCAN,
  SCREEN_RADIUS,
  SCREEN_H,
  SCREEN_W,
  flipQuad,
  fillsScreenByCover,
  growQuad,
  quadToMatrix3d,
  type MockupKind,
} from '@/lib/phone-mockups';

/**
 * A raw app screenshot inside a rendered iPhone: straight on ('front') or turned
 * 45 degrees ('tilt'). The screenshot sits behind the frame and is warped onto the
 * screen, so it follows the perspective. Give it a size from outside (a width, or a
 * height with the aspect ratio doing the rest); everything inside scales with it.
 *
 * `bg` fills any part of the screen the screenshot does not cover (for example
 * when it is cropped short), so use the app's own background colour. `flip`
 * mirrors the phone so the screen faces the other way.
 *
 * The scaling uses tan(atan2(100cqw, Wpx)), which is simply "this container's
 * width divided by the image's width" as a plain number, so it works with no JavaScript.
 */
export function PhoneMockup({
  kind,
  src,
  alt,
  imageWidth,
  imageHeight,
  bg,
  flip,
  sizes,
  priority,
  className,
  style,
}: {
  kind: MockupKind;
  src: string;
  alt: string;
  imageWidth: number;
  imageHeight: number;
  bg: string;
  flip?: boolean;
  sizes: string;
  priority?: boolean;
  className?: string;
  style?: React.CSSProperties;
}) {
  const m = MOCKUPS[kind];
  const quad = growQuad(flip ? flipQuad(m.screen, m.width) : m.screen, OVERSCAN);

  return (
    <div
      className={cn('relative [container-type:inline-size]', className)}
      style={{ aspectRatio: `${m.width} / ${m.height}`, ...style }}
    >
      <div
        className="absolute left-0 top-0 origin-top-left"
        style={{ width: m.width, height: m.height, transform: `scale(tan(atan2(100cqw, ${m.width}px)))` }}
      >
        {/* The screenshot, flat, then warped onto the screen. Its corner radius is tuned to the frame's opening (see SCREEN_RADIUS). */}
        <div
          className="absolute left-0 top-0 origin-top-left overflow-hidden"
          style={{
            width: SCREEN_W,
            height: SCREEN_H,
            background: bg,
            borderRadius: SCREEN_RADIUS,
            transform: quadToMatrix3d(SCREEN_W, SCREEN_H, quad),
          }}
        >
          {/* Almost screen-shaped: fill the whole screen (a sliver off the sides) rather than leave a strip of `bg` along the bottom. */}
          <Image
            src={src}
            alt={alt}
            width={imageWidth}
            height={imageHeight}
            sizes={sizes}
            priority={priority}
            className={fillsScreenByCover(imageWidth, imageHeight) ? 'block h-full w-full object-cover object-top' : 'block h-auto w-full'}
          />
        </div>
        {/* The frame, on top: its bezel and Dynamic Island cover the screen's edges. */}
        <Image
          src={m.src}
          alt=""
          width={m.width}
          height={m.height}
          sizes={sizes}
          priority={priority}
          className={cn('pointer-events-none absolute inset-0 h-full w-full select-none', flip && '-scale-x-100')}
        />
      </div>
    </div>
  );
}
