'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FolderKanban, GalleryHorizontal, UserCircle, Smile, Bot, AppWindow, Scale, Music, ListMusic, Images, NotebookPen, Clapperboard, PanelTop, Sparkles, ToggleRight, LayoutTemplate, Shapes, Info } from 'lucide-react';

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
  { name: 'Home hero', href: '/admin/cuppi-home', icon: LayoutTemplate },
  { name: 'Icon banner', href: '/admin/cuppi-icons', icon: Shapes },
  { name: 'Cuppi pages', href: '/admin/cuppi-pages', icon: ToggleRight },
  { name: 'Cuppi menu', href: '/admin/cuppi-menu', icon: PanelTop },
  { name: 'Cuppi features', href: '/admin/cuppi-features', icon: Sparkles },
  { name: 'Disclaimers', href: '/admin/cuppi-disclaimers', icon: Info },
];

// The two sites edited here. The sidebar shows one site's pages at a time; which one follows the
// address, so a link straight to a Cuppi page opens with Cuppi selected, and the toggle is just
// two links (each lands on that site's first page).
const SITES = [
  { key: 'portfolio', label: 'Portfolio', href: '/admin', nav: navigation },
  { key: 'cuppi', label: 'Cuppi', href: '/admin/cuppi-home', nav: cuppiNavigation },
] as const;

const siteForPath = (pathname: string): (typeof SITES)[number]['key'] => (pathname.startsWith('/admin/cuppi') ? 'cuppi' : 'portfolio');

export function AdminSidebar() {
  const pathname = usePathname();
  const current = siteForPath(pathname);
  const site = SITES.find((s) => s.key === current)!;

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1">
        <nav className="grid items-start gap-2 px-2 text-sm font-medium lg:px-4">
          <div role="group" aria-label="Site to edit" className="mb-2 grid grid-cols-2 rounded-lg border bg-muted p-1">
            {SITES.map((s) => (
              <Link
                key={s.key}
                href={s.href}
                aria-current={s.key === current ? 'true' : undefined}
                className={cn(
                  'rounded-md px-3 py-1.5 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  s.key === current ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {s.label}
              </Link>
            ))}
          </div>
          {site.nav.map((item) => (
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
