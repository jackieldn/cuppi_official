import type {Metadata, Viewport} from 'next';
import '../globals.css';
import { THEME_COLOURS, THEME_SCRIPT } from '@/lib/theme';
import { Toaster } from "@/components/ui/toaster"
import { FirebaseClientProvider } from '@/firebase';
import { CookieConsentBanner } from '@/components/layout/CookieConsentBanner';
import { getDisclaimers } from '@/lib/cuppi-site-data';
import { DisclaimersProvider } from '@/components/cuppi/disclaimer';

const siteUrl = 'https://cuppi.co.uk';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'Cuppi - The British Home super-app',
    template: '%s | Cuppi',
  },
  description: 'Cuppi is your calm and private household app where you save information once and get reminded gently forever.',
  openGraph: {
    title: 'Cuppi - The British Home super-app',
    description: 'Cuppi is your calm and private household app where you save information once and get reminded gently forever.',
    url: siteUrl,
    siteName: 'Cuppi',
    images: [
      {
        url: 'https://firebasestorage.googleapis.com/v0/b/studio-5700093446-89b93.firebasestorage.app/o/homeos_landing%2Fheader_landing%2FHomeOS-v2%2C2.png?alt=media&token=4ae309b8-7f9e-4060-b59d-39d087e0180a',
        width: 512,
        height: 512,
      },
    ],
    locale: 'en_GB',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Cuppi - The British Home super-app',
    description: 'Cuppi is your calm and private household app where you save information once and get reminded gently forever.',
    images: ['https://firebasestorage.googleapis.com/v0/b/studio-5700093446-89b93.firebasestorage.app/o/homeos_landing%2Fheader_landing%2FHomeOS-v2%2C2.png?alt=media&token=4ae309b8-7f9e-4060-b59d-39d087e0180a'],
  },
};

// The browser's own chrome (a phone's address bar) takes the page colour. These follow the device;
// ThemeToggle re-points them when the visitor overrides it.
export const viewport: Viewport = {
  colorScheme: 'light dark',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: THEME_COLOURS.light },
    { media: '(prefers-color-scheme: dark)', color: THEME_COLOURS.dark },
  ],
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const disclaimers = await getDisclaimers();
  return (
    // suppressHydrationWarning: THEME_SCRIPT sets data-theme and the dark class on <html> before React loads.
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* First thing in <head>, so the right palette is on the page before anything paints. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400..700&family=DM+Serif+Display:ital@0;1&family=Inter:wght@400;500;700&family=Space+Grotesk:wght@500;700&display=swap" rel="stylesheet" />
      </head>
      <body className="theme-cuppi font-body antialiased">
        <FirebaseClientProvider>
          <DisclaimersProvider items={disclaimers}>{children}</DisclaimersProvider>
          <Toaster />
          <CookieConsentBanner />
        </FirebaseClientProvider>
      </body>
    </html>
  );
}
