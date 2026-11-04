'use client';

import { useRef } from 'react';
import Image from 'next/image';
import { MusicCover } from '@/lib/about-types';
import { Separator } from '../ui/separator';
import { Reveal } from '../ui/reveal';
import { CARD_IMG_SCALE } from '@/lib/card-flight';
import { useReflowShuffle } from '@/lib/use-reflow-shuffle';

interface MusicTasteSectionProps {
  covers: MusicCover[];
}

// How far (degrees) a cover tips toward the cursor's side; same as the Works page.
const TILT_DEG = 9;

// The shadow under a cover that pops out, built on --lift (0 at rest, 1 while hovered)
// so it grows with the pop: a faint resting shadow, plus a tight dark contact shadow
// and a wide soft one that drop away further the higher the cover is lifted. Both lean
// away from the cursor (--px, --py), as if the light stayed where it was while the
// cover tipped toward you.
const POP_SHADOW = [
  '0 4px 6px -4px rgba(0, 0, 0, 0.1)',
  // Contact shadow: tight and dark, right under the edges.
  'calc(var(--px, 0) * -6px) calc(var(--lift, 0) * 14px + var(--py, 0) * -4px) calc(var(--lift, 0) * 22px) calc(var(--lift, 0) * -4px) rgba(0, 0, 0, calc(var(--lift, 0) * 0.7))',
  // Ambient shadow: wide and soft, the cover's height above the page.
  'calc(var(--px, 0) * -16px) calc(var(--lift, 0) * 42px + var(--py, 0) * -10px) calc(var(--lift, 0) * 70px) calc(var(--lift, 0) * -8px) rgba(0, 0, 0, calc(var(--lift, 0) * 0.65))',
].join(', ');

// Darkness (0 to 1) of a cover right next to the cursor, and of one far from it.
const DIM_NEAR = 0.12;
const DIM_FAR = 0.78;
// Slow enough to feel like light easing in and out, and to smooth the cursor's movement.
const DIM_FADE_MS = 600;

/**
 * Album covers, square, no rounding and no gaps, running edge to edge across the
 * browser. Render this OUTSIDE the page's padded container so it can use the full width.
 */
export function MusicTasteSection({ covers }: MusicTasteSectionProps) {
  const gridRef = useRef<HTMLDivElement>(null);
  const frame = useRef(0);

  // Resizing the window past a breakpoint changes the column count: covers then travel
  // to their new cells one after another, in a random order, instead of jumping.
  useReflowShuffle(gridRef, (covers?.length ?? 0) > 0);

  // While the cursor is over the grid, every cover is darkened by how far it is from the
  // cursor: the one under it is untouched, its neighbours are barely dimmed, and the
  // darkness deepens with distance, like light leaking out from the hovered cover. Set
  // straight on the elements (no state, no re-renders), once per frame.
  const applyDim = (clientX: number, clientY: number) => {
    const grid = gridRef.current;
    if (!grid) return;
    grid.querySelectorAll<HTMLElement>('.music-cover').forEach((cover) => {
      const dim = cover.querySelector<HTMLElement>('.music-dim');
      if (!dim) return;
      const r = cover.getBoundingClientRect();
      const under = clientX >= r.left && clientX <= r.right && clientY >= r.top && clientY <= r.bottom;
      // Distance from the cursor to this cover's centre, in cover-widths.
      const d = Math.hypot(clientX - (r.left + r.width / 2), clientY - (r.top + r.height / 2)) / r.width;
      const t = Math.min(1, Math.max(0, (d - 0.5) / 3));
      dim.style.opacity = under ? '0' : String(DIM_NEAR + (DIM_FAR - DIM_NEAR) * t * t * (3 - 2 * t));
    });
  };
  const handlePointerMove = (e: React.PointerEvent) => {
    if (e.pointerType !== 'mouse') return;
    const { clientX, clientY } = e;
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => applyDim(clientX, clientY));
  };
  const clearDim = () => {
    cancelAnimationFrame(frame.current);
    gridRef.current?.querySelectorAll<HTMLElement>('.music-dim').forEach((dim) => {
      dim.style.opacity = '0';
    });
  };

  if (!covers || covers.length === 0) {
    return null;
  }

  return (
    // overflow-x-clip: covers still travelling from a wider layout would otherwise
    // flash a horizontal scrollbar while the window shrinks.
    <section id="music-taste" className="scroll-mt-20 overflow-x-clip">
      <div className="container mx-auto px-4">
        <Separator className="my-16" />
        <Reveal className="text-center">
          <h2 className="font-headline text-5xl font-bold tracking-tight text-foreground sm:text-6xl mb-16">
            Music taste
          </h2>
        </Reveal>
      </div>
      <div
        ref={gridRef}
        onPointerMove={handlePointerMove}
        onPointerLeave={clearDim}
        className="relative grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8"
      >
        {covers.map((cover, index) => (
          // The hovered cover rises above its neighbours (it grows past its own cell).
          <Reveal key={cover.id} stagger={50} className="relative hover:z-10">
            <MusicCard cover={cover} priority={index < 8} />
          </Reveal>
        ))}
      </div>
    </section>
  );
}

// The same tilt-and-shine hover as the Works covers: CSS variables set straight on
// the element, so moving the mouse never re-renders anything.
function MusicCard({ cover, priority }: { cover: MusicCover; priority: boolean }) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  // Measured on the wrapper, which doesn't tilt, so the maths can't feed back on itself.
  const handlePointerMove = (e: React.PointerEvent) => {
    if (e.pointerType !== 'mouse') return;
    const wrapper = wrapperRef.current;
    const card = cardRef.current;
    if (!wrapper || !card) return;
    const r = wrapper.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * 2 - 1;
    const y = ((e.clientY - r.top) / r.height) * 2 - 1;
    card.style.setProperty('--rx', `${-y * TILT_DEG}deg`);
    card.style.setProperty('--ry', `${x * TILT_DEG}deg`);
    card.style.setProperty('--px', String(x));
    card.style.setProperty('--py', String(y));
    card.style.setProperty('--mx', `${(x + 1) * 50}%`);
    card.style.setProperty('--my', `${(y + 1) * 50}%`);
    card.style.setProperty('--lift', '1');
  };

  const handlePointerLeave = () => {
    const card = cardRef.current;
    if (!card) return;
    ['--rx', '--ry'].forEach((v) => card.style.setProperty(v, '0deg'));
    ['--px', '--py', '--lift'].forEach((v) => card.style.setProperty(v, '0'));
  };

  return (
    <div ref={wrapperRef} className="music-cover" onPointerMove={handlePointerMove} onPointerLeave={handlePointerLeave}>
      <div
        ref={cardRef}
        className="relative aspect-square overflow-hidden"
        style={{
          transform: 'perspective(900px) rotateX(var(--rx, 0deg)) rotateY(var(--ry, 0deg)) scale(calc(1 + var(--lift, 0) * 0.025))',
          boxShadow: POP_SHADOW,
          transition: 'transform 220ms ease-out, box-shadow 300ms ease-out',
        }}
      >
        <Image
          src={cover.imageUrl}
          alt={cover.title || 'Album cover'}
          fill
          priority={priority}
          className="object-cover"
          // Counter-moves against the tilt so the picture sits a little behind the card.
          style={{
            transform: `scale(${CARD_IMG_SCALE}) translate(calc(var(--px, 0) * -6px), calc(var(--py, 0) * -6px))`,
            transition: 'transform 220ms ease-out',
          }}
          sizes="(max-width: 640px) 34vw, (max-width: 768px) 25vw, (max-width: 1024px) 20vw, (max-width: 1280px) 17vw, 13vw"
        />
        {/* Shine: a soft highlight that tracks the cursor, strongest while hovered. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            background: 'radial-gradient(circle at var(--mx, 50%) var(--my, 50%), rgba(255,255,255,0.55), rgba(255,255,255,0) 60%)',
            mixBlendMode: 'overlay',
            opacity: 'var(--lift, 0)',
            transition: 'opacity 300ms ease-out',
          }}
        />
        {/* Dimmer: its opacity is set from the cursor's distance (see MusicTasteSection). */}
        <div
          aria-hidden="true"
          className="music-dim pointer-events-none absolute inset-0 bg-black opacity-0"
          style={{ transition: `opacity ${DIM_FADE_MS}ms ease-out` }}
        />
      </div>
    </div>
  );
}
