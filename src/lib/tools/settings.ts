// What the admin controls about the Tools: which are live, which are in the menu, each tile's colour and icon,
// and the order. One document (cuppi_home/tools) holds a list with one entry per tool.
//
// Whatever is stored is only ever read through resolveToolSettings, which drops tools that no longer exist,
// adds new ones at the end (live, in the menu), and checks every colour and picture address, so a bad
// document can make the list plain but never break a page.
//
// Imports use the .ts extension so the unit tests can load this from Node.

import { TOOLS, type ToolDef } from './registry.ts';
import { safeImageUrl } from '../safe-urls.ts';
import type { TileColour } from '../features-types.ts';

export type ToolSetting = {
  slug: string;
  /** Off, and the page does not exist (404), the tool is not listed and not in the sitemap. */
  live: boolean;
  /** In the "Tools" menu at the top of the site. */
  inMenu: boolean;
  tile: TileColour;
  /** The icon picture on the tile (a transparent PNG, like the app's own). Without one, a simple drawn symbol shows. */
  iconUrl?: string;
};

/** A tool together with what the admin has set for it. */
export type ResolvedTool = ToolDef & ToolSetting;

const TILES: TileColour[] = ['pink', 'green', 'blue', 'amber'];

export const defaultToolSettings = (): ToolSetting[] => TOOLS.map((t) => ({ slug: t.slug, live: true, inMenu: true, tile: t.tile }));

/** The stored document -> one entry per tool, in the admin's order. */
export function resolveToolSettings(stored: unknown): ToolSetting[] {
  const defaults = new Map(defaultToolSettings().map((d) => [d.slug, d]));
  const raw = stored && typeof stored === 'object' ? (stored as Record<string, unknown>).tools : undefined;

  const out: ToolSetting[] = [];
  const seen = new Set<string>();
  if (Array.isArray(raw)) {
    for (const item of raw) {
      if (!item || typeof item !== 'object') continue;
      const r = item as Record<string, unknown>;
      const slug = typeof r.slug === 'string' ? r.slug : '';
      const base = defaults.get(slug);
      if (!base || seen.has(slug)) continue;
      seen.add(slug);
      const iconUrl = safeImageUrl(r.iconUrl);
      out.push({
        slug,
        live: typeof r.live === 'boolean' ? r.live : base.live,
        inMenu: typeof r.inMenu === 'boolean' ? r.inMenu : base.inMenu,
        tile: TILES.includes(r.tile as TileColour) ? (r.tile as TileColour) : base.tile,
        ...(iconUrl ? { iconUrl } : {}),
      });
    }
  }
  for (const d of defaults.values()) if (!seen.has(d.slug)) out.push(d);
  return out;
}

/** Every tool with its settings, in the admin's order. */
export function resolveTools(stored: unknown): ResolvedTool[] {
  const defs = new Map(TOOLS.map((t) => [t.slug, t]));
  return resolveToolSettings(stored).map((s) => ({ ...defs.get(s.slug)!, ...s }));
}

export const liveTools = (tools: ResolvedTool[]): ResolvedTool[] => tools.filter((t) => t.live);
export const menuTools = (tools: ResolvedTool[]): ResolvedTool[] => tools.filter((t) => t.live && t.inMenu);
