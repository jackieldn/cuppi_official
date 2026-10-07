"use client";

import { useState, CSSProperties, useEffect } from "react";
import Link from "next/link";
import { Home, LayoutGrid, UserCircle, Palette, Smile, AppWindow } from "lucide-react";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";
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
  const [clickedItem, setClickedItem] = useState<string | null>(null);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleAnimationEnd = () => {
    setClickedItem(null);
  };
  
  const getAnimation = (label: string): CSSProperties => {
    if (clickedItem === label) {
      return { animation: 'icon-bounce 0.7s cubic-bezier(0.2, 0, 1, 0.5)' };
    }
    return {};
  };

  if (!isClient || pathname.startsWith('/admin')) {
    return null;
  }

  return (
    <footer className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2">
      <TooltipProvider delayDuration={100}>
        <nav
          className="flex items-end justify-center gap-2 rounded-2xl border bg-card/80 p-2 backdrop-blur-lg"
          aria-label="Main Navigation"
        >
          {dockItems.map((item) => (
            <Tooltip key={item.label}>
              <TooltipTrigger asChild>
                <Link
                  href={item.href}
                  onClick={() => setClickedItem(item.label)}
                  onAnimationEnd={handleAnimationEnd}
                  style={getAnimation(item.label)}
                  className={cn(
                    "group relative flex size-12 items-center justify-center rounded-xl bg-background/50 text-foreground transition-transform duration-200 ease-in-out hover:-translate-y-2 hover:bg-primary hover:text-primary-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
                  )}
                  aria-label={item.label}
                >
                  <item.icon className="size-6" />
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
