'use client';

import { useEffect, useId, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Reveal } from '@/components/ui/reveal';
import type { FeatureBlock } from '@/lib/features-types';
import { Phone } from './phone';
import { TINTS } from './tints';
import { MarkedText } from '../marked-text';
import { stripDisclaimers } from '@/lib/disclaimers';

type Tabs = Extract<FeatureBlock, { type: 'tabs' }>;

/**
 * A colour card with a list of short topics beside a picture. One topic is open at a time; opening
 * another swaps the picture. Every picture is already in place (they cross-fade), so the card never
 * changes size. On a phone there is no side picture: each topic carries its own, under its words, so it is plain which
 * topic it belongs to, and it opens and closes with the topic.
 *
 * Only the open topic's picture (and, while it fades out, the one before it) is on the page. A phone render is big (a
 * 3D-warped screenshot and a frame, each fading in with a mask), and a page with several of these cards used to hold
 * every topic's picture at once, which was enough to run a phone out of memory when scrolled quickly.
 */
export function TabsBlock({ block }: { block: Tabs }) {
  const [active, setActive] = useState(0);
  /** The topic that was open before this one, kept on the page only while its picture fades out. */
  const [leaving, setLeaving] = useState<number | null>(null);
  const uid = useId();
  const tint = TINTS[block.tint];
  const open = Math.min(active, block.items.length - 1);
  const textRight = block.side === 'right';
  /** True on a phone (under the `md` breakpoint), where the pictures sit inside the topics. Desktop until the page is running. */
  const [inline, setInline] = useState(false);

  useEffect(() => {
    const query = window.matchMedia('(max-width: 767px)');
    const update = () => setInline(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    if (leaving === null) return;
    const t = window.setTimeout(() => setLeaving(null), 600);
    return () => window.clearTimeout(t);
  }, [leaving]);

  const choose = (i: number) => {
    if (i === open) return;
    setLeaving(open);
    setActive(i);
  };

  return (
    <Reveal className="px-3 py-3 sm:px-6">
      <section className="mx-auto max-w-6xl">
        {(block.title || block.intro) && (
          <div className="px-4 pb-6 sm:px-6">
            {block.title && <h2 className="max-w-3xl font-headline font-normal text-3xl leading-tight tracking-tight sm:text-4xl"><MarkedText text={block.title} /></h2>}
            {block.intro && <p className="mt-3 max-w-2xl text-lg leading-relaxed text-cuppi-ink-soft"><MarkedText text={block.intro} /></p>}
          </div>
        )}
        <div className={cn('grid overflow-hidden rounded-[2rem] md:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]', tint.surface, tint.text)}>
          <div className={cn('flex flex-col justify-center px-6 py-6 sm:px-12 md:py-14', textRight && 'md:order-2')}>
            {block.items.map((item, i) => {
              const isOpen = i === open;
              return (
                <div key={i} className={cn(i > 0 && 'border-t')} style={{ borderColor: 'color-mix(in srgb, currentColor 16%, transparent)' }}>
                  <h3>
                    <button
                      type="button"
                      id={`${uid}-t${i}`}
                      aria-expanded={isOpen}
                      aria-controls={`${uid}-p${i}`}
                      onClick={() => choose(i)}
                      className="flex w-full items-start justify-between gap-4 py-5 text-left font-headline text-2xl font-normal leading-tight sm:text-3xl"
                    >
                      {stripDisclaimers(item.title)}
                      {isOpen ? <ChevronUp className="mt-1 h-6 w-6 shrink-0" aria-hidden /> : <ChevronDown className="mt-1 h-6 w-6 shrink-0 opacity-70" aria-hidden />}
                    </button>
                  </h3>
                  <div
                    id={`${uid}-p${i}`}
                    role="region"
                    aria-labelledby={`${uid}-t${i}`}
                    aria-hidden={!isOpen}
                    className={cn('grid transition-[grid-template-rows,opacity] duration-500 motion-reduce:transition-none', isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0')}
                  >
                    <div className="overflow-hidden">
                      <p className={cn('whitespace-pre-line pb-6 text-lg leading-relaxed', tint.muted)}><MarkedText text={item.body} /></p>
                      {/* On a phone the topic's picture sits here, in a softly shaded panel so it is clearly part of this topic. It is only
                          on the page while the topic is open (and while it closes). `overflow-hidden` because a phone can hang above its box. */}
                      {inline && (i === open || i === leaving) && (
                        <div className="relative mb-6 h-[22rem] overflow-hidden rounded-2xl" style={{ background: 'color-mix(in srgb, currentColor 7%, transparent)' }}>
                          <Phone image={item.image} sizes="92vw" sink={3} />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          {/* The picture beside the list, from md up (on a phone the pictures are inside the topics). `overflow-hidden` because a phone
              is taller than its box and can hang above it. */}
          <div className={cn('relative hidden min-h-[32rem] overflow-hidden md:block', textRight && 'md:order-1')}>
            {block.items.map((item, i) =>
              !inline && (i === open || i === leaving) ? (
                <div key={i} aria-hidden={i !== open} className={cn('absolute inset-0 transition-opacity duration-500 motion-reduce:transition-none', i === open ? 'opacity-100' : 'pointer-events-none opacity-0')}>
                  <Phone image={item.image} sizes="(max-width: 768px) 92vw, 52vw" sink={3} />
                </div>
              ) : null,
            )}
          </div>
        </div>
      </section>
    </Reveal>
  );
}
