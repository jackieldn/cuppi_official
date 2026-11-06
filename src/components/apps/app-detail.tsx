'use client';

import Link from "next/link";
import { useRef } from 'react';
import { ArrowUpRight, ChevronLeft, Globe, Smartphone } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/ui/reveal";
import { useDesktop } from '@/components/desktop/desktop-context';
import { SHINE_STYLE, TILT_TRANSFORM, useCursorTilt } from '@/lib/use-cursor-tilt';
import { cn } from "@/lib/utils";
import { KIND_LABEL, linkAction, monthYear, type App } from '@/lib/showcase';
import { AppSections } from './app-sections';
import { IconMark, iconGlow, pageWash } from './icon-mark';
import { RichText } from './rich-text';
import { StatusBadge } from './status-badge';

// Tags cycle through the portfolio palette, as on the project pages.
const TAG_COLOURS = [
  "bg-palette-ocean text-palette-cream hover:bg-palette-ocean/80",
  "bg-palette-lagoon text-palette-ink hover:bg-palette-lagoon/80",
  "bg-palette-sage text-palette-ink hover:bg-palette-sage/80",
];

/**
 * The page for one app or website: the cover in its device and the details beside it,
 * then the sections built in the admin.
 */
export function AppDetail({ app }: { app: App }) {
  const desktop = useDesktop();

  const coverWrapperRef = useRef<HTMLDivElement>(null);
  // Same cursor tilt and shine as the cards on the Works page.
  const { tiltRef, onPointerMove, onPointerLeave } = useCursorTilt<HTMLDivElement>(coverWrapperRef);

  const isApp = app.kind === 'app';
  const ended = app.status === 'decommissioned';
  const action = linkAction(app);
  const KindIcon = isApp ? Smartphone : Globe;

  return (
    <div className="relative flex flex-col">
      {/* Zero-height sticky rail so the button follows the page as it scrolls. */}
      <div
        className={cn(
          "pointer-events-none sticky z-10 h-0",
          // Full screen on a desktop: the traffic lights float in the top-left corner,
          // so the back button sits underneath them.
          desktop.available && desktop.mode === 'full' ? "top-24" : "top-8",
        )}
      >
        <Button
          asChild
          variant="outline"
          className="pointer-events-auto absolute left-8 top-0 h-12 w-12 rounded-full"
          aria-label="Back to apps and websites"
        >
          <Link href="/apps">
            <ChevronLeft className="h-6 w-6" />
          </Link>
        </Button>
      </div>

      {/* overflow-x: clip, not hidden: the cover's glow spills sideways past a narrow screen,
          which would otherwise widen the page, while its downward spill must stay visible. */}
      <main className="flex-1 overflow-x-clip pb-28 sm:pb-32">
        {/* Top: the icon on one side, the details on the other, over a wash of the icon's colour */}
        <section className="relative py-24 sm:py-32">
          <div aria-hidden="true" className="pointer-events-none absolute inset-0" style={{ background: pageWash(app.iconColor) }} />
          <div className="container relative mx-auto px-4">
            <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2 lg:gap-16">
              {app.icon && (
                <Reveal className="w-full justify-self-center lg:justify-self-end">
                  <div
                    ref={coverWrapperRef}
                    className={cn("mx-auto flex w-full max-w-sm items-center justify-center py-4", ended && "saturate-[0.3]")}
                  >
                    <div
                      ref={tiltRef}
                      onPointerMove={onPointerMove}
                      onPointerLeave={onPointerLeave}
                      className="relative"
                      style={{ transform: TILT_TRANSFORM, transition: "transform 220ms ease-out" }}
                    >
                      <IconMark
                        kind={app.kind}
                        icon={app.icon}
                        alt={`${app.title} ${isApp ? 'icon' : 'logo'}`}
                        priority
                        sizes="240px"
                        className={isApp ? "h-52 w-52 sm:h-60 sm:w-60" : "h-32 max-w-full sm:h-40"}
                        style={iconGlow(app.iconColor, 110)}
                      />
                      <div
                        aria-hidden="true"
                        className={cn("pointer-events-none absolute inset-0", isApp ? "rounded-[22.5%]" : "rounded-xl")}
                        style={SHINE_STYLE}
                      />
                    </div>
                  </div>
                </Reveal>
              )}

              <div className={cn("space-y-6", !app.icon && "mx-auto max-w-3xl lg:col-span-2")}>
                <Reveal stagger={140} className="flex flex-wrap items-center gap-3">
                  <span className="inline-flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wider text-palette-lagoon">
                    <KindIcon className="h-4 w-4" />
                    {KIND_LABEL[app.kind]}
                  </span>
                  <StatusBadge status={app.status} />
                </Reveal>

                <Reveal stagger={140} className="flex items-center gap-4">
                    <h1 className="font-headline text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
                    {app.title}
                  </h1>
                </Reveal>

                {app.tagline && app.tagline !== app.description && (
                  <Reveal stagger={140}>
                    <p className="text-xl leading-8 text-foreground/90">{app.tagline}</p>
                  </Reveal>
                )}

                {app.description && (
                  <Reveal stagger={140}>
                    <RichText text={app.description} className="text-lg leading-8 text-foreground/80" />
                  </Reveal>
                )}

                <Reveal stagger={140} className="space-y-2 text-foreground/80">
                  {app.platforms.length > 0 && (
                    <p><strong className="text-palette-lagoon">Platforms:</strong> {app.platforms.join(", ")}</p>
                  )}
                  {monthYear(app.releaseDate) && (
                    <p><strong className="text-palette-lagoon">Launched:</strong> {monthYear(app.releaseDate)}</p>
                  )}
                  {ended && monthYear(app.decommissionedDate) && (
                    <p><strong className="text-palette-lagoon">Decommissioned:</strong> {monthYear(app.decommissionedDate)}</p>
                  )}
                </Reveal>

                {app.tags.length > 0 && (
                  <Reveal stagger={140} className="flex flex-wrap gap-2">
                    {app.tags.map((tag, i) => (
                      <Badge key={tag} variant="secondary" className={TAG_COLOURS[i % TAG_COLOURS.length]}>{tag}</Badge>
                    ))}
                  </Reveal>
                )}

                {(action || ended) && (
                  <Reveal stagger={140}>
                    {action ? (
                      <Button asChild size="lg" className="rounded-full bg-accent text-accent-foreground hover:bg-accent/90">
                        <a href={action.href} target="_blank" rel="noopener noreferrer">
                          {action.label}
                          <ArrowUpRight className="ml-2 h-4 w-4" />
                        </a>
                      </Button>
                    ) : (
                      <p className="rounded-xl border border-border/30 bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
                        This {isApp ? 'app' : 'website'} has been decommissioned and is no longer available.
                      </p>
                    )}
                  </Reveal>
                )}
              </div>
            </div>
          </div>
        </section>

        <AppSections app={app} />
      </main>
    </div>
  );
}
