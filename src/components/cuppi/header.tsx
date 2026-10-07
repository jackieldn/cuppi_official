
'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

const navLinks = [
  { href: '/', label: 'Home' },
  { href: '/blog', label: 'The Cosy Corner' },
  { href: '/faq', label: 'FAQ' },
  { href: '/support', label: 'Support' },
];

export function CuppiHeader() {
  const pathname = usePathname();
  const iconUrl = "https://firebasestorage.googleapis.com/v0/b/studio-5700093446-89b93.firebasestorage.app/o/homeos_landing%2Fheader_landing%2FHomeOS-v2%2C2.png?alt=media&token=4ae309b8-7f9e-4060-b59d-39d087e0180a";

  const isHomePage = pathname === '/';

  return (
    <header className="w-full flex flex-col items-center p-4 pt-8">
      <div className="flex justify-center items-center mb-8 h-[50px]">
        <Link href="/" aria-label="Back to Cuppi page">
          <Image
            src={iconUrl}
            alt="Cuppi App Icon"
            height={50}
            width={50}
          />
        </Link>
      </div>
      <nav className={cn(
        "w-full flex flex-wrap items-center justify-center gap-4 sm:gap-6 bg-card border p-3 rounded-2xl shadow-sm relative",
        isHomePage ? 'max-w-6xl' : 'max-w-4xl'
      )}>
        <div className="flex flex-wrap justify-center gap-4 sm:gap-6 flex-1">
          {navLinks.map((link) => {
            const isActive = (link.href === '/' && pathname === '/') || (link.href !== '/' && pathname.startsWith(link.href));
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "text-base font-medium text-muted-foreground transition-colors hover:text-primary mt-1.5",
                  isActive && "text-primary"
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </div>
        <Button 
          asChild 
          className="bg-[#f97316] hover:bg-[#ea580c] text-white font-bold rounded-lg px-6"
        >
          <a href="https://apps.apple.com/gb/app/cuppi/id6754384902" target="_blank" rel="noopener noreferrer">
            Download
          </a>
        </Button>
      </nav>
    </header>
  );
}
