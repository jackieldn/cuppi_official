import type { Metadata } from 'next';
import '../globals.css';
import { Toaster } from '@/components/ui/toaster';
import { FirebaseClientProvider } from '@/firebase';
import { Dock } from '@/components/layout/dock';
import { CardFlightLayer } from '@/components/works/card-flight-layer';
import { TitleBandLayer } from '@/components/works/title-band-layer';
import { DesktopProvider } from '@/components/desktop/desktop-context';
import { PageWindow } from '@/components/desktop/page-window';

const siteUrl = 'https://jackiepoot.co.uk';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'Jack | Senior Motion Graphics Designer',
    template: '%s | Jack',
  },
  description: "Jack's portfolio: motion graphics, iOS apps and websites.",
  openGraph: {
    title: 'Jack | Senior Motion Graphics Designer',
    description: "Jack's portfolio: motion graphics, iOS apps and websites.",
    url: siteUrl,
    siteName: 'Jack',
    locale: 'en_GB',
    type: 'website',
  },
};

export default function PortfolioRootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700&family=Sora:wght@500;700&display=swap" rel="stylesheet" />
      </head>
      <body className="theme-portfolio font-body antialiased">
        <FirebaseClientProvider>
          <DesktopProvider>
            <TitleBandLayer />
            <PageWindow>{children}</PageWindow>
            <Dock />
            <CardFlightLayer />
            <Toaster />
          </DesktopProvider>
        </FirebaseClientProvider>
      </body>
    </html>
  );
}
