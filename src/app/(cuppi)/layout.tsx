import type {Metadata} from 'next';
import '../globals.css';
import { Toaster } from "@/components/ui/toaster"
import { FirebaseClientProvider } from '@/firebase';
import { CookieConsentBanner } from '@/components/layout/CookieConsentBanner';

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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700&family=Space+Grotesk:wght@500;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased">
        <FirebaseClientProvider>
          {children}
          <Toaster />
          <CookieConsentBanner />
        </FirebaseClientProvider>
      </body>
    </html>
  );
}
