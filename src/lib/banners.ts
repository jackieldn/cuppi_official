// Banners: short, temporary notices that sit just under the Cuppi menu (a launch, a holiday closure, a new feature).
//
// The admin writes them in Cuppi > Banners and they are stored as one document (cuppi_home/banners). Each has a first
// and a last day, some words, a colour, and optionally an icon and a link. The site shows the banner whose dates
// cover today and hides it again afterwards, with nobody having to remember to take it down.
//
// Days are plain "YYYY-MM-DD" text, read as UK days (Europe/London). That keeps "from the 1st to the 7th" meaning
// the whole of both days wherever the server happens to be, with no clock arithmetic. Whatever is stored is only
// read through resolveBanners, which drops anything unusable, so a bad document can hide a banner but never break
// a page.
//
// This file imports only other pure helpers (menu-settings, safe-urls), so the unit tests can load it from Node.

import { safeHref } from './menu-settings.ts';
import { safeImageUrl } from './safe-urls.ts';

/** The colours a banner can take: the same five tints the feature pages use, so each one works in light and dark. */
export const BANNER_COLOURS = ['honey', 'sky', 'moss', 'clay', 'lake'] as const;
export type BannerColour = (typeof BANNER_COLOURS)[number];

export type Banner = {
  /** Stable key for the admin ("banner-3"); not shown. */
  id: string;
  /** What the banner says. */
  text: string;
  /** First day it shows, "YYYY-MM-DD". */
  start: string;
  /** Last day it shows (the whole day), "YYYY-MM-DD". */
  end: string;
  colour: BannerColour;
  /** A small picture beside the words: one from our own storage (an admin upload) or this site, or empty. */
  iconUrl: string;
  /** Where clicking goes: "/pricing" or "https://...", or empty for no link. */
  href: string;
};

export const BANNER_LIMITS = { items: 20, text: 140 } as const;

const DAY = /^\d{4}-\d{2}-\d{2}$/;

/** True for a real calendar day written as YYYY-MM-DD ("2026-02-30" is not). */
export function isDay(value: unknown): value is string {
  if (typeof value !== 'string' || !DAY.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

/** Today's date in the UK, as YYYY-MM-DD. Text compares correctly, so "is it between" is a plain string comparison. */
export function ukDay(now: Date = new Date()): string {
  // The en-CA locale writes dates as YYYY-MM-DD.
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/London', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

/** Whether the banner's dates cover this day (both ends included). */
export const isActive = (b: Pick<Banner, 'start' | 'end'>, today: string): boolean => b.start <= today && today <= b.end;

/** Where a banner is in its life, for the admin's list. */
export type BannerPhase = 'live' | 'scheduled' | 'ended';
export const phaseOf = (b: Pick<Banner, 'start' | 'end'>, today: string): BannerPhase => (today < b.start ? 'scheduled' : today > b.end ? 'ended' : 'live');

/**
 * The banner to show today. When dates overlap, the one that started most recently wins (the newest news), and
 * the earlier one still shows when that ends. Null when nothing is scheduled for today.
 */
export function pickBanner(banners: Banner[], today: string): Banner | null {
  const live = banners.filter((b) => isActive(b, today));
  if (!live.length) return null;
  return live.reduce((best, b) => (b.start > best.start ? b : best));
}

const text = (v: unknown, max: number): string => (typeof v === 'string' ? v.trim().slice(0, max) : '');

/**
 * The stored document ({ items: [...] }) -> banners that are safe to use. An entry with no words, a bad date, or an end
 * before its start is dropped; an unknown colour becomes honey; an unsafe link or icon is cleared. The list is capped.
 */
export function resolveBanners(stored: unknown): Banner[] {
  const items = stored && typeof stored === 'object' ? (stored as { items?: unknown }).items : null;
  if (!Array.isArray(items)) return [];
  const out: Banner[] = [];
  const seen = new Set<string>();
  for (const raw of items) {
    if (!raw || typeof raw !== 'object') continue;
    const r = raw as Record<string, unknown>;
    const words = text(r.text, BANNER_LIMITS.text);
    if (!words || !isDay(r.start) || !isDay(r.end) || r.end < r.start) continue;
    let id = text(r.id, 40) || `banner-${out.length + 1}`;
    while (seen.has(id)) id = `${id}-x`;
    seen.add(id);
    out.push({
      id,
      text: words,
      start: r.start,
      end: r.end,
      colour: (BANNER_COLOURS as readonly unknown[]).includes(r.colour) ? (r.colour as BannerColour) : 'honey',
      iconUrl: safeImageUrl(r.iconUrl) ?? '',
      href: safeHref(r.href) ?? '',
    });
    if (out.length >= BANNER_LIMITS.items) break;
  }
  return out;
}

/** Plain-English problems with a list being edited, run when the admin saves. Empty means it can be saved. */
export function validateBanners(list: Banner[]): string[] {
  const problems: string[] = [];
  list.forEach((b, n) => {
    const at = `Banner ${n + 1}${b.text.trim() ? ` ("${b.text.trim().slice(0, 30)}${b.text.trim().length > 30 ? '…' : ''}")` : ''}`;
    if (!b.text.trim()) problems.push(`${at}: needs some words.`);
    if (!isDay(b.start)) problems.push(`${at}: needs a start date.`);
    if (!isDay(b.end)) problems.push(`${at}: needs an end date.`);
    if (isDay(b.start) && isDay(b.end) && b.end < b.start) problems.push(`${at}: the end date is before the start date.`);
    if (b.href.trim() && !safeHref(b.href)) problems.push(`${at}: the link must start with / (a page on this site) or https://.`);
  });
  return problems;
}

/** A fresh banner for the admin's "Add" button: starts today and runs a week. */
export function newBanner(id: string, today: string): Banner {
  const end = new Date(`${today}T00:00:00Z`);
  end.setUTCDate(end.getUTCDate() + 6);
  return { id, text: '', start: today, end: end.toISOString().slice(0, 10), colour: 'honey', iconUrl: '', href: '' };
}
