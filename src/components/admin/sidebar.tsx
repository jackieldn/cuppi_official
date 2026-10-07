'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FolderKanban, GalleryHorizontal, UserCircle, Smile, Bot, AppWindow, Scale } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

const navigation = [
  { name: 'Projects', href: '/admin', icon: FolderKanban },
  { name: 'Snaps Gallery', href: '/admin/snaps', icon: GalleryHorizontal },
  { name: 'Free time', href: '/admin/free-time', icon: Smile },
  { name: 'About Page', href: '/admin/about', icon: UserCircle },
  { name: 'Chatbot', href: '/admin/chatbot', icon: Bot },
  { name: 'Apps & Websites', href: '/admin/apps', icon: AppWindow },
  { name: 'Legal', href: '/admin/legal', icon: Scale },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1">
        <nav className="grid items-start gap-2 px-2 text-sm font-medium lg:px-4">
          {navigation.map((item) => {
            const isActive = item.href === '/admin' ? pathname === item.href : pathname.startsWith(item.href);
            return (
              <Button
                key={item.name}
                asChild
                variant={isActive ? 'secondary' : 'ghost'}
                className="justify-start"
              >
                <Link
                  href={item.href}
                >
                  <item.icon className="h-4 w-4 mr-2" />
                  {item.name}
                </Link>
              </Button>
            )
          })}
        </nav>
      </div>
    </div>
  );
}
