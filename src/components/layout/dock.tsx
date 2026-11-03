"use client";

import { useState, CSSProperties, useEffect, useRef } from "react";
import Link from "next/link";
import { Home, LayoutGrid, UserCircle, Palette, Smile, AppWindow } from "lucide-react";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";
import { startReturnFlight } from "@/lib/card-flight";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const dockItems = [
  { href: "/", icon: Home, label: "Home" },
  { href: "/works", icon: LayoutGrid, label: "Work" },
  { href: "/snaps", icon: Palette, label: "Snaps" },
  { href: "/free-time", icon: Smile, label: "Free time" },
  { href: "/apps", icon: AppWindow, label: "Apps & Websites" },
  { href: "/about", icon: UserCircle, label: "About" },
];

export function Dock() {
  const pathname = usePathname();
  const [isClient, setIsClient] = useState(false);
  // Re-clicking the page you're already on: a single bounce.
  const [clickedItem, setClickedItem] = useState<string | null>(null);
  // Navigating elsewhere: bounce on a loop until the new route has arrived,
  // then let the current bounce finish, like the macOS Dock.
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const arrivedRef = useRef(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

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

  // Sub-pages count too: /works/young-lions lights up Work. Home only matches "/".
  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`);

  if (!isClient || pathname.startsWith('/admin')) {
    return null;
  }

  return (
    // Centred with flexbox rather than translateX(-50%), and sized in whole pixels:
    // fractional positions made tiles re-snap sideways when they lifted.
    <footer className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex justify-center">
      <TooltipProvider delayDuration={100}>
        <nav
          className="pointer-events-auto relative flex items-end justify-center gap-[10px] p-[10px]"
          aria-label="Main Navigation"
        >
          {/*
            The panel (tint, outline, blur) is its own layer rather than the nav's
            own background. A backdrop-filter on an ancestor stops the tiles'
            blur from seeing the page, so the tiles couldn't blur anything.
          */}
          <div
            aria-hidden="true"
            className="absolute inset-0 rounded-[19px] border border-palette-lagoon/60 bg-palette-lagoon/30 backdrop-blur-lg"
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
                    "group relative flex size-[58px] items-center justify-center rounded-[14px] backdrop-blur-md after:absolute after:inset-x-0 after:top-full after:h-4 after:content-[''] transition-transform duration-200 ease-in-out hover:-translate-y-2.5 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background",
                    isActive(item.href)
                      ? "bg-palette-lagoon text-palette-ink"
                      : "bg-background/60 text-foreground hover:bg-primary hover:text-primary-foreground"
                  )}
                  aria-label={item.label}
                  aria-current={isActive(item.href) ? "page" : undefined}
                >
                  <item.icon className="size-7" />
                </Link>
              </TooltipTrigger>
              <TooltipContent>
                <p>{item.label}</p>
              </TooltipContent>
            </Tooltip>
          ))}
        </nav>
      </TooltipProvider>
    </footer>
  );
}
