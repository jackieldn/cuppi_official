// Desktop backgrounds, built from the portfolio palette:
// #0b2027 ink, #40798c ocean, #70a9a1 lagoon, #cfd7c7 sage, #f6f1d1 cream, orange accent.

export interface Wallpaper {
  id: string;
  name: string;
  /** CSS `background` value. */
  background: string;
}

export const WALLPAPERS = [
  {
    id: 'lagoon',
    name: 'Lagoon',
    background: [
      'radial-gradient(ellipse 80% 60% at 15% 20%, rgba(112,169,161,0.55), transparent 60%)',
      'radial-gradient(ellipse 70% 70% at 85% 30%, rgba(64,121,140,0.6), transparent 65%)',
      'radial-gradient(ellipse 90% 60% at 50% 110%, rgba(255,153,0,0.22), transparent 60%)',
      'linear-gradient(160deg, #0b2027 0%, #12333d 55%, #0b2027 100%)',
    ].join(', '),
  },
  {
    id: 'deep-ocean',
    name: 'Deep Ocean',
    background: [
      'radial-gradient(ellipse 90% 70% at 50% 0%, rgba(64,121,140,0.75), transparent 70%)',
      'radial-gradient(ellipse 60% 50% at 80% 90%, rgba(112,169,161,0.3), transparent 70%)',
      'linear-gradient(180deg, #12333d 0%, #0b2027 100%)',
    ].join(', '),
  },
  {
    id: 'sunset',
    name: 'Sunset',
    background: [
      'radial-gradient(ellipse 90% 60% at 50% 105%, rgba(255,153,0,0.75), transparent 65%)',
      'radial-gradient(ellipse 70% 60% at 15% 85%, rgba(230,90,60,0.45), transparent 70%)',
      'linear-gradient(180deg, #0b2027 0%, #3a2f3f 60%, #6b3f2e 100%)',
    ].join(', '),
  },
  {
    id: 'sage-mist',
    name: 'Sage Mist',
    background: [
      'radial-gradient(ellipse 80% 70% at 20% 15%, rgba(246,241,209,0.9), transparent 60%)',
      'radial-gradient(ellipse 70% 70% at 85% 80%, rgba(112,169,161,0.6), transparent 65%)',
      'linear-gradient(150deg, #cfd7c7 0%, #a9c2b8 100%)',
    ].join(', '),
  },
  { id: 'ink', name: 'Ink', background: '#0b2027' },
  { id: 'ocean', name: 'Ocean', background: '#40798c' },
  { id: 'lagoon-solid', name: 'Lagoon Green', background: '#70a9a1' },
  { id: 'sage', name: 'Sage', background: '#cfd7c7' },
  { id: 'cream', name: 'Cream', background: '#f6f1d1' },
  { id: 'orange', name: 'Orange', background: '#ff9900' },
] as const satisfies readonly Wallpaper[];

export type WallpaperId = (typeof WALLPAPERS)[number]['id'];

export const DEFAULT_WALLPAPER: WallpaperId = 'lagoon';

export const isWallpaperId = (id: string): id is WallpaperId => WALLPAPERS.some((w) => w.id === id);

export const wallpaperById = (id: WallpaperId): Wallpaper => WALLPAPERS.find((w) => w.id === id) ?? WALLPAPERS[0];
