'use client';

import Link from 'next/link';
import { Globe, Smartphone } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SHINE_STYLE, TILT_TRANSFORM, useCursorTilt } from '@/lib/use-cursor-tilt';
import { KIND_LABEL, yearOf, type App } from '@/lib/showcase';
import { IconMark, iconGlow, stageBackground } from './icon-mark';
import { StatusBadge } from './status-badge';

// How far the icon floats in front of the card (px): at rest, and extra while hovered.
const ICON_Z = 28;
const ICON_Z_HOVER = 36;

/**
 * One entry on the Apps & Websites page. The card is two layers in real 3D: the face (a
 * stage in the icon's own colour, with the name and one line below) and the icon, floating
 * in front of it. When the card turns under the cursor the icon sits at a different depth
 * from the face, so it moves against it in parallax, and a soft shadow left on the face
 * under it shows the gap. Tilts and shines like the cards on the Works page.
 */
export function AppCard({ app }: { app: App }) {
  const { wrapperRef, tiltRef, onPointerMove, onPointerLeave } = useCursorTilt<HTMLAnchorElement>();
  const ended = app.status === 'decommissioned';
  const isApp = app.kind === 'app';
  const meta = [isApp ? app.platforms.join(' · ') || KIND_LABEL.app : KIND_LABEL.website, yearOf(app.releaseDate)]
    .filter(Boolean)
    .join(' · ');

  return (
    <div ref={wrapperRef} onPointerMove={onPointerMove} onPointerLeave={onPointerLeave} className="h-full">
      <Link
        ref={tiltRef}
        href={`/apps/${app.slug}`}
        // No overflow clipping here: it would flatten the 3D. The face below does the clipping.
        className="group relative block h-full rounded-2xl shadow-lg transition-shadow duration-300 hover:shadow-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        style={{
          transform: TILT_TRANSFORM,
          transformStyle: 'preserve-3d',
          transition: 'transform 220ms ease-out, box-shadow 300ms ease-out',
        }}
      >
        {/* The face */}
        <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-border/30 bg-card">
          <div
            className={cn('relative flex aspect-[16/10] w-full items-center justify-center overflow-hidden bg-muted', ended && 'saturate-[0.15]')}
            style={{ background: stageBackground(app.iconColor) }}
          >
            {/* Shine: a soft highlight that tracks the cursor, strongest while hovered. It is on
                the face, behind the icon, so it lights the background only. */}
            <div aria-hidden="true" className="pointer-events-none absolute inset-0" style={SHINE_STYLE} />
            {app.icon ? (
              // Where the icon's shadow falls on the face. It stays put while the icon floats, so
              // the two slide apart as the card turns.
              <div
                aria-hidden="true"
                className={cn(
                  'absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-[38%] rounded-[22.5%] bg-black/45 blur-xl',
                  isApp ? 'h-28 w-28 sm:h-32 sm:w-32' : 'h-16 w-[55%]'
                )}
              />
            ) : (
              <div className="text-white/30">{isApp ? <Smartphone className="h-14 w-14" /> : <Globe className="h-14 w-14" />}</div>
            )}
            <StatusBadge status={app.status} className="absolute left-3 top-3" />
          </div>

          <div className="flex flex-1 flex-col gap-2 p-5">
            <div className="min-w-0">
              <h3 className="truncate font-headline text-lg font-semibold leading-6 text-foreground transition-colors group-hover:text-accent">
                {app.title}
              </h3>
              <p className="truncate text-xs text-muted-foreground">{meta}</p>
            </div>
            {app.tagline && <p className="line-clamp-2 text-sm leading-6 text-foreground/70">{app.tagline}</p>}
          </div>
        </div>

        {/* The icon, floating in front of the face. Same box as the stage, so it centres on it. */}
        {app.icon && (
          <div
            className={cn('pointer-events-none absolute inset-x-0 top-0 flex aspect-[16/10] items-center justify-center', ended && 'saturate-[0.15]')}
            style={{
              // Comes further forward while the card is hovered (--lift is set by the tilt hook).
              transform: `translateZ(calc(${ICON_Z}px + var(--lift, 0) * ${ICON_Z_HOVER}px))`,
              transition: 'transform 220ms ease-out',
            }}
          >
            <IconMark
              kind={app.kind}
              icon={app.icon}
              alt={`${app.title} ${isApp ? 'icon' : 'logo'}`}
              sizes="144px"
              // A logo needs a definite height (its box takes its width from the picture's shape).
              className={isApp ? 'h-28 w-28 sm:h-32 sm:w-32' : 'h-16 max-w-[55%]'}
              style={iconGlow(app.iconColor, 50)}
            />
          </div>
        )}
      </Link>
    </div>
  );
}
