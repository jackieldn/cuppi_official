import { Home, LayoutGrid, UserCircle, Palette, Smile, AppWindow } from 'lucide-react';

export const dockItems = [
  { href: '/', icon: Home, label: 'Home' },
  { href: '/works', icon: LayoutGrid, label: 'Work' },
  { href: '/snaps', icon: Palette, label: 'Snaps' },
  { href: '/free-time', icon: Smile, label: 'Free time' },
  { href: '/apps', icon: AppWindow, label: 'Apps & Websites' },
  { href: '/about', icon: UserCircle, label: 'About' },
];

export type DockItem = (typeof dockItems)[number];

// Sub-pages count too: /works/young-lions belongs to Work. Home only matches "/".
export const dockItemMatches = (href: string, pathname: string) =>
  href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`);

export const findDockItem = (pathname: string) => dockItems.find((item) => dockItemMatches(item.href, pathname));
