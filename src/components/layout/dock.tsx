"use client";

import { useState, CSSProperties, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";
import { startReturnFlight } from "@/lib/card-flight";
import { useDesktop } from "@/components/desktop/desktop-context";
import { DESKTOP_ICONS } from "@/components/desktop/apps";
import { dockItems, dockItemMatches, findDockItem } from "@/components/layout/dock-items";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";


export function Dock() {
  const pathname = usePathname();
  const desktop = useDesktop();
  const [isClient, setIsClient] = useState(false);
  // Re-clicking the page you're already on: a single bounce.
  const [clickedItem, setClickedItem] = useState<string | null>(null);
  // Navigating elsewhere: bounce on a loop until the new route has arrived,
  // then let the current bounce finish, like the macOS Dock.
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const arrivedRef = useRef(false);
  // Phones only (the classes below are max-md): the Dock slides away while scrolling down
  // and slides back as soon as the page scrolls up.
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    let last = window.scrollY;
    let ticking = false;
    const update = () => {
      ticking = false;
      const y = window.scrollY;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      // Rubber-banding past either end of the page isn't the user scrolling.
      if (y < 0 || y > max) return;
      const delta = y - last;
      if (y <= 60) {
        setHidden(false);
        last = y;
      } else if (Math.abs(delta) > 6) {
        // Small movements add up until they pass the threshold, so a slow scroll still counts.
        setHidden(delta > 0);
        last = y;
      }
    };
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(update);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // A new page starts at the top with the Dock showing.
  useEffect(() => {
    setHidden(false);
  }, [pathname]);

  useEffect(() => {
    if (pendingHref && pathname === pendingHref) {
      arrivedRef.current = true;
    }
  }, [pathname, pendingHref]);

  // Never bounce forever if navigation stalls or fails.
  useEffect(() => {
    if (!pendingHref) return;
    const timeout = setTimeout(() => setPendingHref(null), 15000);
    return () => clearTimeout(timeout);
  }, [pendingHref]);

  const handleClick = (e: React.MouseEvent, item: (typeof dockItems)[number]) => {
    const opensElsewhere = e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0;
    // Desktop easter egg: a Dock click brings a minimised or closed window back.
    if (!opensElsewhere) desktop.open();
    if (opensElsewhere || item.href === pathname) {
      setClickedItem(item.label);
      return;
    }
    // From a project page to the works grid: the cover flies back to its card.
    if (item.href === '/works' && pathname.startsWith('/works/')) {
      startReturnFlight(pathname.slice('/works/'.length));
    }
    arrivedRef.current = false;
    setPendingHref(item.href);
  };

  const handleAnimationEnd = () => {
    setClickedItem(null);
  };

  const handleAnimationIteration = () => {
    if (arrivedRef.current) setPendingHref(null);
  };

  const getAnimation = (item: (typeof dockItems)[number]): CSSProperties => {
    if (pendingHref === item.href) {
      return { animation: 'icon-bounce 1s linear infinite', willChange: 'transform' };
    }
    if (clickedItem === item.label) {
      return { animation: 'icon-bounce 1s linear', willChange: 'transform' };
    }
    return {};
  };

  // With the window closed, no page is open, so nothing lights up.
  const isActive = (href: string) => desktop.windowState !== 'closed' && dockItemMatches(href, pathname);
  const minimisedItem = desktop.windowState === 'minimised' ? findDockItem(pathname) : undefined;
  // Minimised app windows (the Journal, say), in the order they were minimised.
  const minimisedApps = desktop.minimisedApps.flatMap((id) => DESKTOP_ICONS.filter((app) => app.id === id));

  if (!isClient || pathname.startsWith('/admin')) {
    return null;
  }

  return (
    // Centred with flexbox rather than translateX(-50%), and sized in whole pixels:
    // fractional positions made tiles re-snap sideways when they lifted.
    <footer
      className={cn(
        "pointer-events-none fixed inset-x-0 bottom-4 z-50 flex justify-center transition-transform duration-300 ease-out motion-reduce:transition-none",
        // Slides down past the bottom edge (its own height plus its gap from the edge).
        hidden && "max-md:translate-y-[calc(100%+2rem)]"
      )}
      // Tabbing to a hidden Dock brings it back.
      onFocusCapture={() => setHidden(false)}
    >
      <TooltipProvider delayDuration={100}>
        <nav
          className="pointer-events-auto relative flex items-end justify-center gap-[6px] p-[8px] sm:gap-[10px] sm:p-[10px]"
          aria-label="Main Navigation"
        >
          {/*
            The panel (tint, outline, blur) is its own layer rather than the nav's
            own background. A backdrop-filter on an ancestor stops the tiles'
            blur from seeing the page, so the tiles couldn't blur anything.
          */}
          <div
            aria-hidden="true"
            className="absolute inset-0 rounded-[30px] border sm:rounded-[38px] border-palette-lagoon/60 bg-palette-lagoon/30 backdrop-blur-lg"
          />
          {dockItems.map((item) => (
            <Tooltip key={item.label}>
              <TooltipTrigger asChild>
                <Link
                  href={item.href}
                  onClick={(e) => handleClick(e, item)}
                  onAnimationEnd={handleAnimationEnd}
                  onAnimationIteration={handleAnimationIteration}
                  style={getAnimation(item)}
                  className={cn(
                    // The after: strip is an invisible hit area below the tile. It lifts with
                    // it, so the spot the tile just left still counts as hovered (otherwise
                    // the tile drops, loses the cursor, lifts again and jiggles).
                    // will-change keeps the tile on its own compositor layer at rest too, so it
                    // isn't re-rasterised (and nudged sideways) each time it lifts or lands.
                    "group relative flex size-[44px] items-center justify-center rounded-[22px] backdrop-blur-md will-change-transform sm:size-[58px] sm:rounded-[28px] after:absolute after:inset-x-0 after:top-full after:h-4 after:content-[''] transition-transform duration-200 ease-in-out hover:-translate-y-2.5 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background",
                    isActive(item.href)
                      ? "bg-palette-lagoon text-palette-ink"
                      : "bg-background/60 text-foreground hover:bg-primary hover:text-primary-foreground"
                  )}
                  aria-label={item.label}
                  aria-current={isActive(item.href) ? "page" : undefined}
                >
                  <item.icon className="size-6 sm:size-7" />
                </Link>
              </TooltipTrigger>
              <TooltipContent>
                <p>{item.label}</p>
              </TooltipContent>
            </Tooltip>
          ))}
          {(minimisedItem || minimisedApps.length > 0) && (
            <div aria-hidden="true" className="relative mx-1 w-px self-stretch bg-palette-lagoon/50" />
          )}
          {minimisedApps.map((app) => (
            <Tooltip key={app.id}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => desktop.openApp(app.id)}
                  aria-label={`Restore ${app.label} window`}
                  className="group relative flex size-[58px] animate-in zoom-in-50 fade-in items-center justify-center overflow-hidden rounded-[14px] border border-palette-lagoon/50 bg-background/80 backdrop-blur-md duration-300 transition-transform ease-in-out hover:-translate-y-2.5 focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {/* The app's own icon, shrunk to fit the tile. */}
                  <span className="origin-center scale-[0.85]">
                    <app.Icon />
                  </span>
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{app.label}</p>
              </TooltipContent>
            </Tooltip>
          ))}
          {minimisedItem && (
            <>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={desktop.open}
                    aria-label={`Restore ${minimisedItem.label} window`}
                    className="group relative flex size-[58px] animate-in zoom-in-50 fade-in items-center justify-center overflow-hidden rounded-[14px] border border-palette-lagoon/50 bg-background/80 text-foreground backdrop-blur-md duration-300 transition-transform ease-in-out hover:-translate-y-2.5 focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    {/* A tiny window: title bar dots over the page's icon. */}
                    <span className="absolute inset-x-0 top-0 flex h-3 items-center gap-[3px] bg-palette-ink/90 px-1.5">
                      <span className="size-[4px] rounded-full bg-[#ff5f57]" />
                      <span className="size-[4px] rounded-full bg-[#febc2e]" />
                      <span className="size-[4px] rounded-full bg-[#28c840]" />
                    </span>
                    <minimisedItem.icon className="mt-2 size-6" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{minimisedItem.label}</p>
                </TooltipContent>
              </Tooltip>
            </>
          )}
        </nav>
      </TooltipProvider>
    </footer>
  );
}
