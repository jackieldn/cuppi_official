'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ArrowRight, ChevronDown, Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { APP_STORE_URL } from '@/lib/invite';
import { GROUP_LABELS, MENU_GROUPS, hasPage, type Feature, type FeatureGroup } from '@/lib/features-types';
import { ActionButton } from '../action-button';
import { AppTile } from '../feature-icon';

const ICON_URL =
  'https://firebasestorage.googleapis.com/v0/b/studio-5700093446-89b93.firebasestorage.app/o/homeos_landing%2Fheader_landing%2FHomeOS-v2%2C2.png?alt=media&token=4ae309b8-7f9e-4060-b59d-39d087e0180a';

type MenuKey = 'features' | 'yours';
type Group = { group: FeatureGroup; items: Feature[] };

// The row of links, left to right. The two with `menu` open a panel of features.
const LINKS: { key: string; label: string; href: string; menu?: MenuKey }[] = [
  { key: 'features', label: 'Features', href: '/features', menu: 'features' },
  { key: 'yours', label: 'Your Home', href: '/features', menu: 'yours' },
  { key: 'blog', label: 'The Cosy Corner', href: '/blog' },
  { key: 'faq', label: 'FAQ', href: '/faq' },
  { key: 'support', label: 'Support', href: '/support' },
];

// Width of each panel, in px, used to centre it under its button.
const PANEL_WIDTH: Record<MenuKey, number> = { features: 560, yours: 288 };

export function SiteHeader({ groups }: { groups: Group[] }) {
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

  // Which link is "current": a feature page belongs to the menu its feature lives in.
  const slug = pathname.startsWith('/features/') ? pathname.split('/')[2] : null;
  const current = slug ? groups.flatMap((g) => g.items).find((f) => f.slug === slug) : null;
  const activeKey: string | null = current
    ? current.group === 'yours'
      ? 'yours'
      : 'features'
    : (LINKS.find((l) => !l.menu && (pathname === l.href || pathname.startsWith(`${l.href}/`)))?.key ??
      (pathname === '/features' ? 'features' : null));

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
          <Link href="/" aria-label="Cuppi Home, home page" className="flex shrink-0 items-center gap-2.5 pr-2">
            <Image src={ICON_URL} alt="" width={38} height={38} />
            <span className="whitespace-nowrap font-headline font-normal text-lg tracking-tight sm:text-xl">Cuppi Home</span>
          </Link>

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
            {LINKS.map((l) => {
              const menu = l.menu;
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
            <ActionButton href={APP_STORE_URL} external>
              Download
            </ActionButton>
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
            <div className="rounded-[2rem] border border-cuppi-line bg-cuppi-card p-4 shadow-[0_24px_60px_-24px_rgba(43,33,24,0.45)]">
              <div className={cn('grid gap-4', open === 'features' && 'grid-cols-2')}>
                {byGroup(MENU_GROUPS.find((m) => m.key === open)?.groups ?? []).map(({ group, items }, gi) => (
                  <div key={group} className="cuppi-fade-up" style={{ '--d': `${gi * 50}ms` } as React.CSSProperties}>
                    {open === 'features' && (
                      <p className="px-3 pb-2 text-xs font-semibold uppercase tracking-[0.14em] text-cuppi-ink-soft">{GROUP_LABELS[group].title}</p>
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
            <div className="max-h-[75vh] overflow-y-auto rounded-[2rem] border border-cuppi-line bg-cuppi-card p-3 shadow-[0_24px_60px_-24px_rgba(43,33,24,0.45)]">
              {MENU_GROUPS.map((m) => (
                <div key={m.key}>
                  <button
                    type="button"
                    onClick={() => setMobileSection((cur) => (cur === m.key ? null : m.key))}
                    aria-expanded={mobileSection === m.key}
                    className="flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left text-lg font-medium hover:bg-cuppi-honey-soft"
                  >
                    {m.label}
                    <ChevronDown className={cn('h-5 w-5 transition-transform duration-300', mobileSection === m.key && 'rotate-180')} aria-hidden />
                  </button>
                  {mobileSection === m.key && (
                    <div className="px-1 pb-2">
                      {byGroup(m.groups).map(({ group, items }) => (
                        <div key={group} className="pb-1">
                          {m.key === 'features' && (
                            <p className="px-3 pb-1 pt-2 text-xs font-semibold uppercase tracking-[0.14em] text-cuppi-ink-soft">{GROUP_LABELS[group].title}</p>
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
              ))}
              {LINKS.filter((l) => !l.menu).map((l) => (
                <Link key={l.key} href={l.href} className="block rounded-2xl px-4 py-3 text-lg font-medium hover:bg-cuppi-honey-soft">
                  {l.label}
                </Link>
              ))}
            </div>
          </div>
        )}
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
