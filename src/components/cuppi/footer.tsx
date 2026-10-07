'use client';

import Image from 'next/image';
import Link from 'next/link';

export function CuppiFooter() {
  const iconUrl = "https://firebasestorage.googleapis.com/v0/b/studio-5700093446-89b93.firebasestorage.app/o/homeos_landing%2Fheader_landing%2FHomeOS-v2%2C2.png?alt=media&token=4ae309b8-7f9e-4060-b59d-39d087e0180a";
  const appStoreBadgeUrl = "https://firebasestorage.googleapis.com/v0/b/studio-5700093446-89b93.firebasestorage.app/o/homeos_landing%2Fapp_section%2Ffooter%2FDownload_on_the_App_Store_Badge_US-UK_RGB_blk_092917.svg?alt=media&token=84fa9ede-fb95-4693-93f0-8d4c03c405fc";
  const social = {
      facebook: "https://firebasestorage.googleapis.com/v0/b/studio-5700093446-89b93.firebasestorage.app/o/homeos_landing%2Fsocial%2Fsocial_icon-FACEBOOK.svg?alt=media&token=5f6519e2-3067-4054-885f-409c1b0071a3",
      bluesky: "https://firebasestorage.googleapis.com/v0/b/studio-5700093446-89b93.firebasestorage.app/o/homeos_landing%2Fsocial%2Fsocial_icon-BLUESKY.svg?alt=media&token=c94bc3bc-b480-4cbf-970a-8312172b2614",
      x: "https://firebasestorage.googleapis.com/v0/b/studio-5700093446-89b93.firebasestorage.app/o/homeos_landing%2Fsocial%2Fsocial_icon-X.svg?alt=media&token=40b8108f-8f6c-455c-8a1d-85e598f13227",
  }

  return (
      <footer className="w-full border-t border-neutral-200 bg-white text-black">
        <div className="container mx-auto px-4 py-8">
            <div className="grid grid-cols-1 md:grid-cols-3 items-center gap-y-8 md:gap-x-8 text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start gap-4">
                <Image
                  src={iconUrl}
                  alt="Cuppi App Icon"
                  width={40}
                  height={40}
                />
                <p className="text-sm text-neutral-500">&copy; 2026 JackiePoot Creations - Cuppi</p>
              </div>
              <div className="flex flex-col items-center justify-center gap-y-4 order-first md:order-none">
                <div className="flex items-center justify-center gap-x-4 sm:gap-x-6">
                    <Link href="/blog" className="text-sm text-neutral-500 hover:text-black transition-colors">Blog</Link>
                    <Link href="/terms" className="text-sm text-neutral-500 hover:text-black transition-colors">Terms</Link>
                    <Link href="/privacy" className="text-sm text-neutral-500 hover:text-black transition-colors">Privacy</Link>
                    <Link href="/faq" className="text-sm text-neutral-500 hover:text-black transition-colors">FAQ</Link>
                    <Link href="/family-safety" className="text-sm text-neutral-500 hover:text-black transition-colors">Family Safety</Link>
                </div>
                <div className="flex items-center gap-x-4 sm:gap-x-5">
                    <Link href="https://www.facebook.com/cuppiapp/" target="_blank" rel="noopener noreferrer" aria-label="Facebook" className="text-neutral-500 hover:opacity-80 transition-opacity">
                        <Image src={social.facebook} alt="Facebook" width={30} height={30} />
                    </Link>
                    <Link href="https://bsky.app/profile/jackiepoot.co.uk" target="_blank" rel="noopener noreferrer" aria-label="Bluesky" className="text-neutral-500 hover:opacity-80 transition-opacity">
                       <Image src={social.bluesky} alt="Bluesky" width={30} height={30} />
                    </Link>
                    <Link href="https://x.com/cuppiapp" target="_blank" rel="noopener noreferrer" aria-label="X" className="text-neutral-500 hover:opacity-80 transition-opacity">
                        <Image src={social.x} alt="X" width={30} height={30} />
                    </Link>
                </div>
              </div>
              <div className="flex justify-center md:justify-end">
                <Link 
                  href="https://apps.apple.com/gb/app/cuppi/id6754384902" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="hover:opacity-80 transition-opacity"
                  aria-label="Download on the App Store"
                >
                  <Image
                    src={appStoreBadgeUrl}
                    alt="Download on the App Store"
                    width={140}
                    height={46}
                  />
                </Link>
              </div>
            </div>
        </div>
      </footer>
  );
}
