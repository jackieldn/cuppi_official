'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FolderKanban, GalleryHorizontal, UserCircle, Smile, Bot, AppWindow, Scale, Music, ListMusic, Images, NotebookPen, Clapperboard, PanelTop, Sparkles, ToggleRight } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

const navigation = [
  { name: 'Projects', href: '/admin', icon: FolderKanban },
  { name: 'Snaps Gallery', href: '/admin/snaps', icon: GalleryHorizontal },
  { name: 'Free time', href: '/admin/free-time', icon: Smile },
  { name: 'About Page', href: '/admin/about', icon: UserCircle },
  { name: 'Music Taste', href: '/admin/music', icon: Music },
  { name: 'Music Player', href: '/admin/player', icon: ListMusic },
  { name: 'Desktop Videos', href: '/admin/videos', icon: Clapperboard },
  { name: 'Poot XP Pictures', href: '/admin/xp-pictures', icon: Images },
  { name: 'Journal', href: '/admin/journal', icon: NotebookPen },
  { name: 'Chatbot', href: '/admin/chatbot', icon: Bot },
  { name: 'Apps & Websites', href: '/admin/apps', icon: AppWindow },
  { name: 'Legal', href: '/admin/legal', icon: Scale },
];

// The Cuppi website (cuppi.co.uk), edited here.
const cuppiNavigation = [
  { name: 'Cuppi pages', href: '/admin/cuppi-pages', icon: ToggleRight },
  { name: 'Cuppi menu', href: '/admin/cuppi-menu', icon: PanelTop },
  { name: 'Cuppi features', href: '/admin/cuppi-features', icon: Sparkles },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1">
        <nav className="grid items-start gap-2 px-2 text-sm font-medium lg:px-4">
          {navigation.map((item) => (
            <NavItem key={item.name} item={item} pathname={pathname} />
          ))}
          <p className="px-3 pb-1 pt-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Cuppi website</p>
          {cuppiNavigation.map((item) => (
            <NavItem key={item.name} item={item} pathname={pathname} />
          ))}
        </nav>
      </div>
    </div>
  );
}

function NavItem({ item, pathname }: { item: (typeof navigation)[number]; pathname: string }) {
  const isActive = item.href === '/admin' ? pathname === item.href : pathname.startsWith(item.href);
  return (
    <Button asChild variant={isActive ? 'secondary' : 'ghost'} className="justify-start">
      <Link href={item.href}>
        <item.icon className="h-4 w-4 mr-2" />
        {item.name}
      </Link>
    </Button>
  );
}
