'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ArrowRight, ChevronDown, Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { APP_STORE_URL } from '@/lib/invite';
import { GROUP_LABELS, STATUS_LABELS, type Feature, type FeatureGroup } from '@/lib/features-types';
import { FeatureGlyph } from '../feature-icon';
import { TINTS } from '../blocks/tints';

const ICON_URL =
  'https://firebasestorage.googleapis.com/v0/b/studio-5700093446-89b93.firebasestorage.app/o/homeos_landing%2Fheader_landing%2FHomeOS-v2%2C2.png?alt=media&token=4ae309b8-7f9e-4060-b59d-39d087e0180a';

const LINKS = [
  { key: 'features', label: 'Features', href: '/features', menu: true },
  { key: 'blog', label: 'The Cosy Corner', href: '/blog', menu: false },
  { key: 'faq', label: 'FAQ', href: '/faq', menu: false },
  { key: 'support', label: 'Support', href: '/support', menu: false },
] as const;

type Group = { group: FeatureGroup; items: Feature[] };

export function SiteHeader({ groups }: { groups: Group[] }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false); // desktop mega panel
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileFeatures, setMobileFeatures] = useState(false);
  const [pill, setPill] = useState<{ x: number; w: number } | null>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Record<string, HTMLElement | null>>({});
  const closeTimer = useRef<ReturnType<typeof setTimeout>>();
  // A click pins the panel open (so it stays for touch and keyboard users); hover alone does not.
  const pinned = useRef(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const activeKey = LINKS.find((l) => pathname === l.href || pathname.startsWith(`${l.href}/`))?.key ?? null;

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

  // Close everything when the page changes, on Escape, or on a click outside.
  useEffect(() => {
    pinned.current = false;
    setMenuOpen(false);
    setMobileOpen(false);
  }, [pathname]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        pinned.current = false;
        setMenuOpen(false);
        setMobileOpen(false);
      }
    };
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        pinned.current = false;
        setMenuOpen(false);
        setMobileOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('mousedown', onDown);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('mousedown', onDown);
    };
  }, []);

  const openMenu = () => {
    clearTimeout(closeTimer.current);
    setMenuOpen(true);
  };
  const closeMenuSoon = () => {
    if (pinned.current) return;
    clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setMenuOpen(false), 140);
  };

  return (
    <header className="sticky top-0 z-50 px-3 pt-3 sm:px-6" ref={rootRef}>
      <div className="relative mx-auto max-w-6xl">
        <nav
          aria-label="Main"
          className="flex items-center justify-between gap-2 rounded-full border border-cuppi-line bg-cuppi-card/85 py-2 pl-2.5 pr-2 shadow-[0_8px_28px_-14px_rgba(43,33,24,0.4)] backdrop-blur-md"
        >
          <Link href="/" aria-label="Cuppi home" className="group flex items-center gap-2.5 rounded-full pr-3">
            <Image
              src={ICON_URL}
              alt=""
              width={38}
              height={38}
              className="rounded-[0.85rem] transition-transform duration-500 [transition-timing-function:var(--ease-spring)] group-hover:-rotate-6 group-hover:scale-110"
            />
            <span className="font-headline text-xl font-semibold tracking-tight [font-variation-settings:'SOFT'_100]">Cuppi</span>
          </Link>

          {/* Desktop links */}
          <div
            ref={trackRef}
            className="relative hidden items-center md:flex"
            onMouseLeave={() => moveTo(activeKey)}
          >
            <span
              aria-hidden
              className={cn(
                'absolute inset-y-0 left-0 rounded-full bg-cuppi-honey-soft transition-[transform,width,opacity] duration-500 [transition-timing-function:var(--ease-spring)]',
                pill ? 'opacity-100' : 'opacity-0',
              )}
              style={{ transform: `translateX(${pill?.x ?? 0}px)`, width: pill?.w ?? 0 }}
            />
            {LINKS.map((l) =>
              l.menu ? (
                <div key={l.key} onMouseEnter={openMenu} onMouseLeave={closeMenuSoon}>
                  <button
                    type="button"
                    ref={(el) => {
                      itemRefs.current[l.key] = el;
                    }}
                    aria-expanded={menuOpen}
                    aria-controls="features-menu"
                    onMouseEnter={() => moveTo(l.key)}
                    onFocus={() => moveTo(l.key)}
                    onClick={() => {
                      if (menuOpen && pinned.current) {
                        pinned.current = false;
                        setMenuOpen(false);
                      } else {
                        pinned.current = true;
                        openMenu();
                      }
                    }}
                    className="relative z-10 flex items-center gap-1 rounded-full px-4 py-2 text-[0.95rem] font-medium"
                  >
                    {l.label}
                    <ChevronDown
                      className={cn('h-4 w-4 transition-transform duration-300 [transition-timing-function:var(--ease-spring)]', menuOpen && 'rotate-180')}
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
                    setMenuOpen(false);
                    moveTo(l.key);
                  }}
                  onFocus={() => moveTo(l.key)}
                  aria-current={activeKey === l.key ? 'page' : undefined}
                  className="relative z-10 rounded-full px-4 py-2 text-[0.95rem] font-medium"
                >
                  {l.label}
                </Link>
              ),
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <a
              href={APP_STORE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full bg-cuppi-brand-deep px-5 py-2.5 text-[0.95rem] font-semibold text-cuppi-card transition-transform duration-300 [transition-timing-function:var(--ease-spring)] hover:scale-105"
            >
              Download
            </a>
            <button
              type="button"
              className="grid h-10 w-10 place-items-center rounded-full hover:bg-cuppi-honey-soft md:hidden"
              aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileOpen}
              onClick={() => setMobileOpen((o) => !o)}
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </nav>

        {/* Desktop mega panel */}
        {menuOpen && (
          <div
            id="features-menu"
            className="cuppi-pop absolute left-0 right-0 top-full z-50 mt-2 hidden md:block"
            onMouseEnter={openMenu}
            onMouseLeave={closeMenuSoon}
          >
            <div className="rounded-[2rem] border border-cuppi-line bg-cuppi-card p-5 shadow-[0_24px_60px_-24px_rgba(43,33,24,0.45)]">
              <div className="grid grid-cols-4 gap-5">
                {groups.map(({ group, items }, gi) => (
                  <div key={group} className="cuppi-fade-up" style={{ '--d': `${gi * 50}ms` } as React.CSSProperties}>
                    <p className="px-3 pb-2 text-xs font-semibold uppercase tracking-[0.14em] text-cuppi-ink-soft">{GROUP_LABELS[group].title}</p>
                    <ul className="space-y-1">
                      {items.map((f) => (
                        <li key={f.slug}>
                          <MenuItem feature={f} />
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex items-center justify-between rounded-2xl bg-cuppi-paper-deep px-5 py-3">
                <p className="text-sm text-cuppi-ink-soft">More arriving all the time.</p>
                <Link href="/features" className="group inline-flex items-center gap-1.5 text-sm font-semibold text-cuppi-brand-deep">
                  See every feature
                  <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" aria-hidden />
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Mobile sheet */}
        {mobileOpen && (
          <div className="cuppi-pop absolute left-0 right-0 top-full z-50 mt-2 md:hidden">
            <div className="max-h-[75vh] overflow-y-auto rounded-[2rem] border border-cuppi-line bg-cuppi-card p-3 shadow-[0_24px_60px_-24px_rgba(43,33,24,0.45)]">
              <button
                type="button"
                onClick={() => setMobileFeatures((o) => !o)}
                aria-expanded={mobileFeatures}
                className="flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left text-lg font-medium hover:bg-cuppi-honey-soft"
              >
                Features
                <ChevronDown className={cn('h-5 w-5 transition-transform duration-300', mobileFeatures && 'rotate-180')} aria-hidden />
              </button>
              {mobileFeatures && (
                <div className="px-1 pb-2">
                  {groups.map(({ group, items }) => (
                    <div key={group} className="pb-1">
                      <p className="px-3 pb-1 pt-2 text-xs font-semibold uppercase tracking-[0.14em] text-cuppi-ink-soft">{GROUP_LABELS[group].title}</p>
                      {items.map((f) => (
                        <MenuItem key={f.slug} feature={f} compact />
                      ))}
                    </div>
                  ))}
                  <Link href="/features" className="block px-3 py-2 text-sm font-semibold text-cuppi-brand-deep">
                    See every feature →
                  </Link>
                </div>
              )}
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

function MenuItem({ feature, compact }: { feature: Feature; compact?: boolean }) {
  const tint = TINTS[feature.tint];
  const status = STATUS_LABELS[feature.status];
  return (
    <Link
      href={`/features/${feature.slug}`}
      className="group flex items-center gap-3 rounded-2xl px-3 py-2.5 transition-colors hover:bg-cuppi-honey-soft/70"
    >
      <span
        className={cn(
          'grid shrink-0 place-items-center rounded-xl transition-transform duration-500 [transition-timing-function:var(--ease-spring)] group-hover:-rotate-6 group-hover:scale-110',
          compact ? 'h-9 w-9' : 'h-10 w-10',
          tint.chip,
        )}
      >
        <FeatureGlyph icon={feature.icon} className="h-[1.15rem] w-[1.15rem]" />
      </span>
      <span className="min-w-0">
        <span className="flex items-center gap-2 text-[0.95rem] font-semibold leading-tight">
          {feature.name}
          {status && <span className="rounded-full bg-cuppi-honey-soft px-2 py-px text-[0.65rem] font-semibold text-cuppi-ink-soft">{status}</span>}
        </span>
        {!compact && <span className="block text-sm leading-snug text-cuppi-ink-soft">{feature.tagline}</span>}
      </span>
    </Link>
  );
}
