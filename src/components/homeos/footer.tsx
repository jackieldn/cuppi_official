'use client';

import Image from 'next/image';
import Link from 'next/link';

export function HomeOSFooter() {
  const iconUrl = "https://firebasestorage.googleapis.com/v0/b/studio-5700093446-89b93.firebasestorage.app/o/homeos_landing%2Fheader_landing%2FHomeOS-v2%2C2.png?alt=media&token=4ae309b8-7f9e-4060-b59d-39d087e0180a";
  const appStoreBadgeUrl = "https://firebasestorage.googleapis.com/v0/b/studio-5700093446-89b93.firebasestorage.app/o/homeos_landing%2Fapp_section%2Ffooter%2FDownload_on_the_App_Store_Badge_US-UK_RGB_blk_092917.svg?alt=media&token=84fa9ede-fb95-4693-93f0-8d4c03c405fc";

  return (
      <footer className="w-full border-t border-neutral-200 bg-white text-black">
        <div className="container mx-auto px-4 py-8">
            <div className="grid grid-cols-1 md:grid-cols-3 items-center gap-y-8 md:gap-x-8 text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start gap-4">
                <Image
                  src={iconUrl}
                  alt="HomeOS App Icon"
                  width={40}
                  height={40}
                />
                <p className="text-sm text-neutral-500">&copy; 2026 JackiePoot Creations - HomeOS</p>
              </div>
              <div className="flex items-center justify-center gap-8 order-first md:order-none">
                <Link href="/homeos/terms" className="text-sm text-neutral-500 hover:text-black transition-colors">Terms & Conditions</Link>
                <Link href="/homeos/privacy" className="text-sm text-neutral-500 hover:text-black transition-colors">Privacy Policy</Link>
              </div>
              <div className="flex justify-center md:justify-end">
                <div className="opacity-50" aria-label="Coming soon to the App Store">
                  <Image
                    src={appStoreBadgeUrl}
                    alt="Download on the App Store"
                    width={120}
                    height={40}
                  />
                </div>
              </div>
            </div>
        </div>
      </footer>
  );
}
