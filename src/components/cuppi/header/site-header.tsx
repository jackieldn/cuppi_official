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


type MenuKey = 'features' | 'yours';
type Group = { group: FeatureGroup; items: Feature[] };

// The row of links, left to right, comes from the admin (see menu-settings.ts). The two with
// a `panel` open a panel of features.

// Width of each panel, in px, used to centre it under its button.
const PANEL_WIDTH: Record<MenuKey, number> = { features: 720, yours: 288 };

export function SiteHeader({ groups, links: configured, download }: { groups: Group[]; links: MenuLink[]; download: DownloadButton }) {
  const pathname = usePathname();
  const [open, setOpen] = useState<MenuKey | null>(null); // desktop panel
  const [panelLeft, setPanelLeft] = useState(0);
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
    const hasItems = panel ? byGroup(MENU_GROUPS.find((m) => m.key === panel)?.groups ?? []).some((g) => g.items.length > 0) : false;
    return panel && !hasItems ? { ...l, panel: undefined } : l;
  });

  // Which link is "current": a feature page belongs to the menu its feature lives in.
  const slug = pathname.startsWith('/features/') ? pathname.split('/')[2] : null;
  const current = slug ? groups.flatMap((g) => g.items).find((f) => f.slug === slug) : null;
  const activeKey: string | null = current
    ? current.group === 'yours'
      ? 'yours'
      : 'features'
    : (links.find((l) => !l.panel && !isExternal(l.href) && (pathname === l.href || pathname.startsWith(`${l.href}/`)))?.key ??
      (pathname === '/features' ? (links.find((l) => l.panel === 'features') ?? links.find((l) => l.href === '/features'))?.key ?? null : null));

  // The highlight rests on the current page's link and glides to whichever one is hovered.
  const moveTo = useCallback((key: string | null) => {
    const el = key ? itemRefs.current[key] : null;
    setPill(el ? { x: el.offsetLeft, w: el.offsetWidth } : null);
  }, []);
  useLayoutEffect(() => {
    moveTo(activeKey);
    // Link widths change when the web font arrives and when the window resizes, so
    // measure again whenever the track changes size or fonts finish loading.
    const track = trackRef.current;
    const observer = track && typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => moveTo(activeKey)) : null;
    if (track) observer?.observe(track);
    document.fonts?.ready.then(() => moveTo(activeKey));
    return () => observer?.disconnect();
  }, [activeKey, moveTo]);

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
      setPanelLeft(Math.max(0, Math.min(ideal, f.width - PANEL_WIDTH[key])));
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
          <div ref={trackRef} className="relative hidden items-center lg:flex" onMouseLeave={() => moveTo(activeKey)}>
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
                    onMouseEnter={() => moveTo(l.key)}
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
                    className="relative z-10 flex items-center gap-1 rounded-full px-4 py-2 text-[0.95rem] font-medium"
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
                    moveTo(l.key);
                  }}
                  onFocus={() => moveTo(l.key)}
                  aria-current={activeKey === l.key ? 'page' : undefined}
                  className="relative z-10 rounded-full px-4 py-2 text-[0.95rem] font-medium"
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

        {/* Desktop panel: re-mounts per menu so it replays its pop-in */}
        {open && (
          <div
            key={open}
            id={`menu-${open}`}
            className="cuppi-pop absolute top-full z-50 mt-2 hidden lg:block"
            style={{ left: panelLeft, width: PANEL_WIDTH[open] }}
            onMouseEnter={() => openMenu(open)}
            onMouseLeave={closeSoon}
          >
            <div className="rounded-[2rem] border border-cuppi-line bg-cuppi-card p-4 shadow-[0_24px_60px_-24px_rgb(var(--c-shadow)/0.45)]">
              <div className={cn('grid gap-4', open === 'features' && 'grid-cols-3')}>
                {byGroup(MENU_GROUPS.find((m) => m.key === open)?.groups ?? []).map(({ group, items }, gi) => (
                  <div key={group} className="cuppi-fade-up" style={{ '--d': `${gi * 50}ms` } as React.CSSProperties}>
                    {open === 'features' && (
                      <p className="px-3 pb-2 font-headline text-lg">{GROUP_LABELS[group].title}</p>
                    )}
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
              {open === 'features' && (
                <div className="mt-3 border-t border-cuppi-line pt-3 text-right">
                  <Link href="/features" className="group inline-flex items-center gap-1.5 px-3 text-sm font-semibold text-cuppi-brand-deep">
                    See every feature
                    <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" aria-hidden />
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Mobile sheet */}
        {mobileOpen && (
          <div className="cuppi-pop absolute left-0 right-0 top-full z-50 mt-2 lg:hidden">
            <div className="max-h-[75vh] overflow-y-auto rounded-[2rem] border border-cuppi-line bg-cuppi-card p-3 shadow-[0_24px_60px_-24px_rgb(var(--c-shadow)/0.45)]">
              {links.map((l) => {
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
                    {mobileSection === m.key && (
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
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Warm-up. The menu panels only exist while open, so their icons would start downloading at the
          click and pop in. These are the same tiles, loaded quietly now and kept out of sight, so the
          pictures are already in the browser's cache when a panel opens (desktop panel or phone menu). */}
      <div aria-hidden className="pointer-events-none fixed left-0 top-0 h-0 w-0 overflow-hidden opacity-0">
        {groups
          .flatMap((g) => g.items)
          .filter((f) => f.iconUrl)
          .map((f) => (
            <AppTile key={f.slug} feature={f} eager className="h-10 w-10" />
          ))}
      </div>
    </header>
  );
}

/** One feature in a menu: its app tile and its name, nothing else. Features without a page yet are not links. */
function MenuItem({ feature }: { feature: Feature }) {
  if (!hasPage(feature)) {
    return (
      <div className="flex items-center gap-3 rounded-2xl px-3 py-2 text-cuppi-ink-soft" aria-disabled="true">
        <AppTile feature={feature} muted className="h-10 w-10" />
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
        className="h-10 w-10 transition-transform duration-500 [transition-timing-function:var(--ease-spring)] group-hover:scale-110"
      />
      <span className="text-[0.95rem] font-semibold">{feature.name}</span>
    </Link>
  );
}
