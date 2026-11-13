import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { FeatureTint } from '@/lib/features-types';
import { TINTS } from './blocks/tints';
import { SpotlightPattern } from './spotlight-pattern';
import type { PatternName } from '@/lib/patterns';

const delay = (ms: number) => ({ '--d': `${ms}ms` }) as React.CSSProperties;

/**
 * The colour block that opens an inner page (a help topic, search results, support):
 * an optional "back" pill, an optional tile beside the title, the title, a line of
 * text, and whatever else the page puts under it (a search box, a button).
 *
 * `align="center"` centres everything and lets the page put something above the title
 * (`top`, e.g. the icon fan). `pattern` lays one of the app's patterns behind the content,
 * quiet in the middle and lighting up under the cursor, like the other heroes.
 */
export function PageHero({
  tint,
  back,
  tile,
  title,
  intro,
  align = 'left',
  top,
  pattern,
  children,
}: {
  tint: FeatureTint;
  back?: { href: string; label: string };
  tile?: React.ReactNode;
  title: string;
  intro?: string;
  align?: 'left' | 'center';
  /** Shown above the title, centred layout only. */
  top?: React.ReactNode;
  pattern?: { name: PatternName; focus: string; shape?: 'circle' | 'ellipse' };
  children?: React.ReactNode;
}) {
  const t = TINTS[tint];
  const centred = align === 'center';
  return (
    <section className="px-3 pt-3 sm:px-6">
      <div
        data-spotlight-host
        className={cn('relative mx-auto max-w-6xl rounded-[2.5rem] px-7 py-12 sm:px-12 sm:py-16', pattern && 'overflow-hidden', centred && 'text-center', t.surface, t.text)}
      >
        {pattern && <SpotlightPattern pattern={pattern.name} focus={pattern.focus} shape={pattern.shape} />}
        {/* `relative` keeps the content above the pattern. */}
        {/* The back pill lives in the block's top-left corner, the same distance from the top and the left
            (1.25rem on a phone, 1.5rem above), so it is in the same place on every page. It is out of the
            flow, so the content below makes room for it with a little extra top padding. */}
        {back && (
          <Link
            href={back.href}
            className="cuppi-fade-up absolute left-5 top-5 z-10 inline-flex items-center gap-1.5 rounded-full bg-cuppi-paper/90 px-3.5 py-1.5 text-sm font-medium text-cuppi-ink transition-colors hover:bg-cuppi-paper sm:left-6 sm:top-6"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden /> {back.label}
          </Link>
        )}
        <div className={cn('relative', back && 'pt-8', centred && 'flex flex-col items-center')}>
          {top && <div className="mb-8 w-full sm:mb-10">{top}</div>}
          <div className={cn('cuppi-fade-up flex items-center gap-5', centred && 'justify-center')} style={delay(80)}>
            {tile}
            <h1 className="font-headline text-4xl font-normal leading-[1.05] tracking-tight sm:text-6xl">{title}</h1>
          </div>
          {intro && (
            <p className={cn('cuppi-fade-up mt-5 max-w-2xl text-lg leading-relaxed sm:text-xl', centred && 'mx-auto', t.muted)} style={delay(160)}>
              {intro}
            </p>
          )}
          {children && (
            <div className={cn('cuppi-fade-up relative z-20 mt-8', centred && 'flex flex-col items-center')} style={delay(240)}>
              {children}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
