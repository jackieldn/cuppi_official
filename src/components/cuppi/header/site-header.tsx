'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ArrowRight, ChevronDown, Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { isExternal, type DownloadButton, type MenuLink } from '@/lib/menu-settings';
import { GROUP_LABELS, MENU_GROUPS, hasPage, type Feature, type FeatureGroup } from '@/lib/features-types';
import { ActionButton } from '../action-button';
import { AppTile } from '../feature-icon';
import { CuppiLogoLink } from '../logo-link';
import { ToolTile } from '../tools/tool-tile';
import type { ResolvedTool } from '@/lib/tools/settings';


type MenuKey = 'features' | 'yours' | 'tools';
type Group = { group: FeatureGroup; items: Feature[] };

// The row of links, left to right, comes from the admin (see menu-settings.ts). The two with
// a `panel` open a panel of features.

// Width of each panel, in px, used to centre it under its button.
const PANEL_WIDTH: Record<MenuKey, number> = { features: 720, yours: 288, tools: 340 };

export function SiteHeader({ groups, tools, links: configured, download }: { groups: Group[]; tools: ResolvedTool[]; links: MenuLink[]; download: DownloadButton }) {
  const pathname = usePathname();
  const [open, setOpen] = useState<MenuKey | null>(null); // desktop panel
  // Where each panel sits. Each has its own, because the panels are different widths: one shared value, worked out for a narrow
  // panel opened from a button far to the right, would push the wide one (hidden, but still laid out) past the edge of the page.
  const [panelLeft, setPanelLeft] = useState<Record<MenuKey, number>>({ features: 0, yours: 0, tools: 0 });
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileSection, setMobileSection] = useState<MenuKey | null>(null);
  const [pill, setPill] = useState<{ x: number; w: number } | null>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Record<string, HTMLElement | null>>({});
  const closeTimer = useRef<ReturnType<typeof setTimeout>>();
  const rootRef = useRef<HTMLElement>(null);
  // A click pins a panel open (so it stays for touch and keyboard users); hover alone does not.
  const pinned = useRef(false);

  const byGroup = (keys: FeatureGroup[]) => groups.filter((g) => keys.includes(g.group));

  // A panel link with nothing to show (every feature in it switched off) becomes a plain link to /features.
  const links = configured.map((l) => {
    const panel = l.panel;
    const hasItems = panel === 'tools' ? tools.length > 0 : panel ? byGroup(MENU_GROUPS.find((m) => m.key === panel)?.groups ?? []).some((g) => g.items.length > 0) : false;
    return panel && !hasItems ? { ...l, panel: undefined } : l;
  });

  // Which link is "current": a feature page belongs to the menu its feature lives in.
  const slug = pathname.startsWith('/features/') ? pathname.split('/')[2] : null;
  const current = slug ? groups.flatMap((g) => g.items).find((f) => f.slug === slug) : null;
  const onTools = pathname === '/tools' || pathname.startsWith('/tools/');
  const activeKey: string | null = current
    ? current.group === 'yours'
      ? 'yours'
      : 'features'
    : onTools
      ? (configured.find((l) => l.panel === 'tools')?.key ?? null)
      : (links.find((l) => !l.panel && !isExternal(l.href) && (pathname === l.href || pathname.startsWith(`${l.href}/`)))?.key ??
      (pathname === '/features' ? (links.find((l) => l.panel === 'features') ?? links.find((l) => l.href === '/features'))?.key ?? null : null));

  // The highlight rests on the current page's link and glides to whichever one is hovered. While a menu is open it rests on that
  // menu's button instead: the panel hangs below the row of links, not inside it, so the pointer travelling down into the panel
  // leaves the row, and the highlight must not fall back to the current page until the menu has closed.
  const openKey = open ? (links.find((l) => l.panel === open)?.key ?? null) : null;
  const resting = openKey ?? activeKey;
  /** The link the pointer is over in the row, so a menu closing under the pointer leaves the highlight where the pointer is. */
  const hoverKey = useRef<string | null>(null);
  const moveTo = useCallback((key: string | null) => {
    const el = key ? itemRefs.current[key] : null;
    setPill(el ? { x: el.offsetLeft, w: el.offsetWidth } : null);
  }, []);
  const hover = (key: string) => {
    hoverKey.current = key;
    moveTo(key);
  };
  useLayoutEffect(() => {
    const rest = () => hoverKey.current ?? resting;
    moveTo(rest());
    // Link widths change when the web font arrives and when the window resizes, so
    // measure again whenever the track changes size or fonts finish loading.
    const track = trackRef.current;
    const observer = track && typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => moveTo(rest())) : null;
    if (track) observer?.observe(track);
    document.fonts?.ready.then(() => moveTo(rest()));
    return () => observer?.disconnect();
  }, [resting, moveTo]);

  const closeAll = useCallback(() => {
    pinned.current = false;
    setOpen(null);
    setMobileOpen(false);
  }, []);

  // Close everything when the page changes, on Escape, or on a click outside.
  useEffect(closeAll, [pathname, closeAll]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && closeAll();
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) closeAll();
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('mousedown', onDown);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('mousedown', onDown);
    };
  }, [closeAll]);

  // Centre the panel under its button, but never let it hang off either edge of the page column.
  const openMenu = (key: MenuKey) => {
    clearTimeout(closeTimer.current);
    const frame = frameRef.current;
    const button = itemRefs.current[key];
    if (frame && button) {
      const f = frame.getBoundingClientRect();
      const b = button.getBoundingClientRect();
      const ideal = b.left - f.left + b.width / 2 - PANEL_WIDTH[key] / 2;
      setPanelLeft((p) => ({ ...p, [key]: Math.max(0, Math.min(ideal, f.width - PANEL_WIDTH[key])) }));
    }
    setOpen(key);
  };
  const closeSoon = () => {
    if (pinned.current) return;
    clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setOpen(null), 140);
  };

  return (
    <header className="sticky top-0 z-50 px-3 pt-3 sm:px-6" ref={rootRef}>
      <div className="relative mx-auto max-w-6xl" ref={frameRef}>
        <nav
          aria-label="Main"
          className="flex items-center justify-between gap-2 rounded-full border border-cuppi-line bg-cuppi-card/85 py-2 pl-[29px] pr-2 backdrop-blur-md"
        >
          <CuppiLogoLink id="header" priority iconWidth={38} iconHeight={40} className="flex shrink-0 items-center gap-2.5 pr-2" textClassName="text-lg tracking-tight sm:text-xl" />

          {/* Desktop links */}
          <div ref={trackRef} className="relative hidden items-center lg:flex" onMouseLeave={() => {
            hoverKey.current = null;
            moveTo(resting);
          }}>
            <span
              aria-hidden
              className={cn(
                'absolute inset-y-0 left-0 rounded-full bg-cuppi-honey-soft transition-[transform,width,opacity] duration-500 [transition-timing-function:var(--ease-spring)]',
                pill ? 'opacity-100' : 'opacity-0',
              )}
              style={{ transform: `translateX(${pill?.x ?? 0}px)`, width: pill?.w ?? 0 }}
            />
            {links.map((l) => {
              const menu = l.panel;
              return menu ? (
                <div key={l.key} onMouseEnter={() => openMenu(menu)} onMouseLeave={closeSoon}>
                  <button
                    type="button"
                    ref={(el) => {
                      itemRefs.current[l.key] = el;
                    }}
                    aria-expanded={open === menu}
                    aria-controls={`menu-${menu}`}
                    onMouseEnter={() => hover(l.key)}
                    onFocus={() => moveTo(l.key)}
                    onClick={() => {
                      if (open === menu && pinned.current) {
                        pinned.current = false;
                        setOpen(null);
                      } else {
                        pinned.current = true;
                        openMenu(menu);
                      }
                    }}
                    className="relative z-10 flex items-center gap-1 whitespace-nowrap rounded-full px-3 py-2 text-[0.95rem] font-medium xl:px-4"
                  >
                    {l.label}
                    <ChevronDown
                      className={cn('h-4 w-4 transition-transform duration-300 [transition-timing-function:var(--ease-spring)]', open === menu && 'rotate-180')}
                      aria-hidden
                    />
                  </button>
                </div>
              ) : (
                <Link
                  key={l.key}
                  href={l.href}
                  {...(isExternal(l.href) ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                  ref={(el) => {
                    itemRefs.current[l.key] = el;
                  }}
                  onMouseEnter={() => {
                    setOpen(null);
                    hover(l.key);
                  }}
                  onFocus={() => moveTo(l.key)}
                  aria-current={activeKey === l.key ? 'page' : undefined}
                  className="relative z-10 whitespace-nowrap rounded-full px-3 py-2 text-[0.95rem] font-medium xl:px-4"
                >
                  {l.label}
                </Link>
              );
            })}
          </div>

          <div className="flex items-center gap-1.5">
            {download.visible && (
              <ActionButton href={download.href} external={isExternal(download.href)}>
                {download.label}
              </ActionButton>
            )}
            <button
              type="button"
              className="grid h-10 w-10 place-items-center rounded-full hover:bg-cuppi-honey-soft lg:hidden"
              aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileOpen}
              onClick={() => setMobileOpen((o) => !o)}
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </nav>

        {/* Desktop panels. Both stay mounted for the life of the page and are only shown or hidden: a panel that mounts on
            open makes the browser start every icon again (a request each, then a blank tile for a moment), which is the
            "icons reload when I open the menu" bug. Closed, a panel is unseen and out of the tab order (`invisible`); opening
            it replays its pop-in because the animation classes are only on while it is open. */}
        {MENU_GROUPS.map((m) => {
          const shown = open === m.key;
          return (
            <div
              key={m.key}
              id={`menu-${m.key}`}
              aria-hidden={!shown}
              className={cn('absolute top-full z-50 mt-2 hidden lg:block', shown ? 'cuppi-pop' : 'pointer-events-none invisible opacity-0')}
              style={{ left: panelLeft[m.key], width: PANEL_WIDTH[m.key] }}
              onMouseEnter={() => shown && openMenu(m.key)}
              onMouseLeave={closeSoon}
            >
              <div className="rounded-[2rem] border border-cuppi-line bg-cuppi-card p-4 shadow-[0_24px_60px_-24px_rgb(var(--c-shadow)/0.45)]">
                <div className={cn('grid gap-4', m.key === 'features' && 'grid-cols-3')}>
                  {byGroup(m.groups).map(({ group, items }, gi) => (
                    <div key={group} className={shown ? 'cuppi-fade-up' : undefined} style={{ '--d': `${gi * 50}ms` } as React.CSSProperties}>
                      {m.key === 'features' && <p className="px-3 pb-2 font-headline text-lg">{GROUP_LABELS[group].title}</p>}
                      <ul className="space-y-0.5">
                        {items.map((f) => (
                          <li key={f.slug}>
                            <MenuItem feature={f} />
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
                {m.key === 'features' && (
                  <div className="mt-3 border-t border-cuppi-line pt-3 text-right">
                    <Link href="/features" className="group inline-flex items-center gap-1.5 px-3 text-sm font-semibold text-cuppi-brand-deep">
                      See every feature
                      <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" aria-hidden />
                    </Link>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* The Tools panel, mounted the same way as the two above (always there, shown or hidden). */}
        <div
          id="menu-tools"
          aria-hidden={open !== 'tools'}
          className={cn('absolute top-full z-50 mt-2 hidden lg:block', open === 'tools' ? 'cuppi-pop' : 'pointer-events-none invisible opacity-0')}
          style={{ left: panelLeft.tools, width: PANEL_WIDTH.tools }}
          onMouseEnter={() => open === 'tools' && openMenu('tools')}
          onMouseLeave={closeSoon}
        >
          <div className="rounded-[2rem] border border-cuppi-line bg-cuppi-card p-4 shadow-[0_24px_60px_-24px_rgb(var(--c-shadow)/0.45)]">
            <ul className={cn('space-y-0.5', open === 'tools' && 'cuppi-fade-up')}>
              {tools.map((t) => (
                <li key={t.slug}>
                  <ToolMenuItem tool={t} />
                </li>
              ))}
            </ul>
            <div className="mt-3 border-t border-cuppi-line pt-3 text-right">
              <Link href="/tools" className="group inline-flex items-center gap-1.5 px-3 text-sm font-semibold text-cuppi-brand-deep">
                See every tool
                <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" aria-hidden />
              </Link>
            </div>
          </div>
        </div>

        {/* Mobile sheet: also always mounted (hidden with display:none when closed), and so is every section's list (collapsed
            sections are `hidden`), so opening the sheet or a section never starts an icon downloading again. */}
        <div className={cn('absolute left-0 right-0 top-full z-50 mt-2 lg:hidden', mobileOpen ? 'cuppi-pop' : 'hidden')}>
            <div className="max-h-[75vh] overflow-y-auto rounded-[2rem] border border-cuppi-line bg-cuppi-card p-3 shadow-[0_24px_60px_-24px_rgb(var(--c-shadow)/0.45)]">
              {links.map((l) => {
                if (l.panel === 'tools') {
                  return (
                    <div key={l.key}>
                      <button
                        type="button"
                        onClick={() => setMobileSection((cur) => (cur === 'tools' ? null : 'tools'))}
                        aria-expanded={mobileSection === 'tools'}
                        className="flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left text-lg font-medium hover:bg-cuppi-honey-soft"
                      >
                        {l.label}
                        <ChevronDown className={cn('h-5 w-5 transition-transform duration-300', mobileSection === 'tools' && 'rotate-180')} aria-hidden />
                      </button>
                      <div
                        aria-hidden={mobileSection !== 'tools'}
                        className={cn(
                          'grid transition-[grid-template-rows,opacity,visibility] duration-300 [transition-timing-function:var(--ease-calm)] motion-reduce:transition-none',
                          mobileSection === 'tools' ? 'grid-rows-[1fr] opacity-100' : 'invisible grid-rows-[0fr] opacity-0',
                        )}
                      >
                        <div className="overflow-hidden">
                          <div className="px-1 pb-2">
                            {tools.map((t) => (
                              <ToolMenuItem key={t.slug} tool={t} />
                            ))}
                            <Link href="/tools" className="block px-3 py-2 text-sm font-semibold text-cuppi-brand-deep">
                              See every tool →
                            </Link>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                }
                const m = l.panel ? MENU_GROUPS.find((g) => g.key === l.panel) : undefined;
                if (!m) {
                  return (
                    <Link key={l.key} href={l.href} {...(isExternal(l.href) ? { target: '_blank', rel: 'noopener noreferrer' } : {})} className="block rounded-2xl px-4 py-3 text-lg font-medium hover:bg-cuppi-honey-soft">
                      {l.label}
                    </Link>
                  );
                }
                return (
                  <div key={l.key}>
                    <button
                      type="button"
                      onClick={() => setMobileSection((cur) => (cur === m.key ? null : m.key))}
                      aria-expanded={mobileSection === m.key}
                      className="flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left text-lg font-medium hover:bg-cuppi-honey-soft"
                    >
                      {l.label}
                      <ChevronDown className={cn('h-5 w-5 transition-transform duration-300', mobileSection === m.key && 'rotate-180')} aria-hidden />
                    </button>
                    {/* Slides open and shut: the row's height eases between 0 and its content's. The list stays mounted (its icons are
                        already downloaded); closed, it is unseen and out of the tab order once the slide has finished. */}
                    <div
                      aria-hidden={mobileSection !== m.key}
                      className={cn(
                        'grid transition-[grid-template-rows,opacity,visibility] duration-300 [transition-timing-function:var(--ease-calm)] motion-reduce:transition-none',
                        mobileSection === m.key ? 'grid-rows-[1fr] opacity-100' : 'invisible grid-rows-[0fr] opacity-0',
                      )}
                    >
                    <div className="overflow-hidden">
                    <div className="px-1 pb-2">
                        {byGroup(m.groups).map(({ group, items }) => (
                          <div key={group} className="pb-1">
                            {m.key === 'features' && (
                              <p className="px-3 pb-1 pt-2 font-headline text-lg">{GROUP_LABELS[group].title}</p>
                            )}
                            {items.map((f) => (
                              <MenuItem key={f.slug} feature={f} />
                            ))}
                          </div>
                        ))}
                        {m.key === 'features' && (
                          <Link href="/features" className="block px-3 py-2 text-sm font-semibold text-cuppi-brand-deep">
                            See every feature →
                          </Link>
                        )}
                    </div>
                    </div>
                    </div>
                  </div>
                );
              })}
            </div>
        </div>
      </div>
    </header>
  );
}

/** One feature in a menu: its app tile and its name, nothing else. Features without a page yet are not links. */
function MenuItem({ feature }: { feature: Feature }) {
  if (!hasPage(feature)) {
    return (
      <div className="flex items-center gap-3 rounded-2xl px-3 py-2 text-cuppi-ink-soft" aria-disabled="true">
        <AppTile feature={feature} muted eager instant className="h-10 w-10" />
        <span className="flex items-center gap-2 text-[0.95rem] font-semibold">
          {feature.name}
          <span className="rounded-full bg-cuppi-honey-soft px-2 py-px text-[0.65rem] font-semibold text-cuppi-ink-soft">Soon</span>
        </span>
      </div>
    );
  }
  return (
    <Link href={`/features/${feature.slug}`} className="group flex items-center gap-3 rounded-2xl px-3 py-2 transition-colors hover:bg-cuppi-honey-soft/70">
      <AppTile
        feature={feature}
        eager
        instant
        className="h-10 w-10 transition-transform duration-500 [transition-timing-function:var(--ease-spring)] group-hover:scale-110"
      />
      <span className="text-[0.95rem] font-semibold">{feature.name}</span>
    </Link>
  );
}

/** One tool in the Tools menu: its tile and its name. */
function ToolMenuItem({ tool }: { tool: ResolvedTool }) {
  return (
    <Link href={`/tools/${tool.slug}`} className="group flex items-center gap-3 rounded-2xl px-3 py-2 transition-colors hover:bg-cuppi-honey-soft/70">
      <ToolTile tool={tool} eager instant className="h-10 w-10 transition-transform duration-500 [transition-timing-function:var(--ease-spring)] group-hover:scale-110" />
      <span className="text-[0.95rem] font-semibold">{tool.name}</span>
    </Link>
  );
}
