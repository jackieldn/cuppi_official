'use client';

import { useEffect, useRef, useState } from 'react';
import { FadeImage } from '@/components/cuppi/fade-image';
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
  scaleQuad,
  type MockupKind,
} from '@/lib/phone-mockups';

/** The width a phone is laid out at until it has been measured (and on the server): a middling size. */
const DEFAULT_RES = 420;
/** The laid-out width moves in steps of this many pixels, so it does not change on every pixel of a resize. */
const RES_STEP = 40;

/**
 * How many pixels wide to lay a phone out: its shown width, rounded up to a step, so it is as sharp as the screen can show
 * and no bigger. Attach `ref` to the phone's outer box.
 */
function useLayoutRes() {
  const ref = useRef<HTMLDivElement>(null);
  const [res, setRes] = useState(DEFAULT_RES);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(([entry]) => {
      const w = entry.contentRect.width;
      if (w > 0) setRes(Math.max(RES_STEP * 3, Math.ceil(w / RES_STEP) * RES_STEP));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, res] as const;
}

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
 * It is laid out about as wide as it is shown (`useLayoutRes`), not at the render's own 1046, and scaled to fit. A warped layer
 * is a graphics layer the size it is laid out at (times the screen's pixel density), however small it is shown: at the render's
 * size one phone was tens of megabytes of layers on a phone, and a card of them ran the browser out of memory.
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
  const [box, res] = useLayoutRes();
  // Everything below is measured in the render's own pixels; `f` brings it down to the size it is laid out at.
  const f = res / m.width;
  const quad = scaleQuad(growQuad(flip ? flipQuad(m.screen, m.width) : m.screen, OVERSCAN), f);
  const layoutW = res;
  const layoutH = m.height * f;
  const screenW = SCREEN_W * f;
  const screenH = SCREEN_H * f;

  return (
    <div
      ref={box}
      className={cn('relative [container-type:inline-size]', className)}
      style={{ aspectRatio: `${m.width} / ${m.height}`, ...style }}
    >
      <div
        className="absolute left-0 top-0 origin-top-left"
        style={{ width: layoutW, height: layoutH, transform: `scale(tan(atan2(100cqw, ${layoutW}px)))` }}
      >
        {/* The screenshot, flat, then warped onto the screen. Its corner radius is tuned to the frame's opening (see SCREEN_RADIUS). */}
        <div
          className="absolute left-0 top-0 origin-top-left overflow-hidden"
          style={{
            width: screenW,
            height: screenH,
            background: bg,
            borderRadius: SCREEN_RADIUS * f,
            transform: quadToMatrix3d(screenW, screenH, quad),
          }}
        >
          {/* Almost screen-shaped: fill the whole screen (a sliver off the sides) rather than leave a strip of `bg` along the bottom. */}
          <FadeImage
            soft
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
        <FadeImage
          soft
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
