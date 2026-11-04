'use client';

// Every desktop app, by id. To add one: write its window component, add its id
// to `AppId` in desktop-context, and list it here. Apps in DESKTOP_ICONS also
// get an icon on the desktop, in that order down the right-hand side.

import type { ComponentType } from 'react';
import { Music2 } from 'lucide-react';

import { useDesktop, type AppId } from '../desktop-context';
import { MusicApp } from './music-app';
import { WallpaperApp } from './wallpaper-app';

const APPS: Record<AppId, ComponentType> = {
  wallpaper: WallpaperApp,
  music: MusicApp,
};

// App-icon art: a rounded tile, like a macOS app icon.
function MusicIcon() {
  return (
    <span className="relative flex size-14 items-center justify-center overflow-hidden rounded-[14px] bg-[linear-gradient(145deg,#ff9900_0%,#f2545b_55%,#a23b72_100%)] shadow-[0_6px_16px_-4px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.35)]">
      <span aria-hidden="true" className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/25 to-transparent" />
      <Music2 aria-hidden="true" className="relative size-7 text-white drop-shadow" strokeWidth={2.25} />
    </span>
  );
}

export const DESKTOP_ICONS: { id: AppId; label: string; Icon: () => JSX.Element }[] = [
  { id: 'music', label: 'Music', Icon: MusicIcon },
];

export function DesktopApps() {
  const { openApps } = useDesktop();
  return (
    <>
      {openApps.map((id) => {
        const App = APPS[id];
        return <App key={id} />;
      })}
    </>
  );
}
