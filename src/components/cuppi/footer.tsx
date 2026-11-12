import Image from 'next/image';
import Link from 'next/link';
import { getPageFeatures } from '@/lib/features';
import { APP_STORE_URL } from '@/lib/invite';

const ICON_URL =
  'https://firebasestorage.googleapis.com/v0/b/studio-5700093446-89b93.firebasestorage.app/o/homeos_landing%2Fheader_landing%2FHomeOS-v2%2C2.png?alt=media&token=4ae309b8-7f9e-4060-b59d-39d087e0180a';
const APP_STORE_BADGE =
  'https://firebasestorage.googleapis.com/v0/b/studio-5700093446-89b93.firebasestorage.app/o/homeos_landing%2Fapp_section%2Ffooter%2FDownload_on_the_App_Store_Badge_US-UK_RGB_blk_092917.svg?alt=media&token=84fa9ede-fb95-4693-93f0-8d4c03c405fc';
const SOCIAL = [
  {
    name: 'Facebook',
    href: 'https://www.facebook.com/cuppiapp/',
    icon: 'https://firebasestorage.googleapis.com/v0/b/studio-5700093446-89b93.firebasestorage.app/o/homeos_landing%2Fsocial%2Fsocial_icon-FACEBOOK.svg?alt=media&token=5f6519e2-3067-4054-885f-409c1b0071a3',
  },
  {
    name: 'Bluesky',
    href: 'https://bsky.app/profile/jackiepoot.co.uk',
    icon: 'https://firebasestorage.googleapis.com/v0/b/studio-5700093446-89b93.firebasestorage.app/o/homeos_landing%2Fsocial%2Fsocial_icon-BLUESKY.svg?alt=media&token=c94bc3bc-b480-4cbf-970a-8312172b2614',
  },
  {
    name: 'X',
    href: 'https://x.com/cuppiapp',
    icon: 'https://firebasestorage.googleapis.com/v0/b/studio-5700093446-89b93.firebasestorage.app/o/homeos_landing%2Fsocial%2Fsocial_icon-X.svg?alt=media&token=40b8108f-8f6c-455c-8a1d-85e598f13227',
  },
];

const HELP = [
  { href: '/faq', label: 'FAQ' },
  { href: '/support', label: 'Support' },
  { href: '/blog', label: 'The Cosy Corner' },
];
const LEGAL = [
  { href: '/privacy', label: 'Privacy' },
  { href: '/terms', label: 'Terms' },
  { href: '/family-safety', label: 'Family Safety' },
  { href: '/security', label: 'Security' },
];

const linkClass = 'text-cuppi-ink-soft transition-colors hover:text-cuppi-brand-deep';

export async function CuppiFooter() {
  const features = await getPageFeatures();

  return (
    <footer className="mt-10 px-3 pb-3 sm:px-6 sm:pb-6">
      <div className="mx-auto max-w-6xl rounded-[2.5rem] bg-cuppi-paper-deep px-7 py-12 sm:px-12">
        <div className="grid gap-10 md:grid-cols-[1.3fr_1fr_1fr_1fr]">
          <div className="space-y-4">
            <Link href="/" className="inline-flex items-center gap-3" aria-label="Cuppi Home, home page">
              <Image src={ICON_URL} alt="" width={44} height={44} />
              <span className="whitespace-nowrap font-headline font-normal text-2xl">Cuppi Home</span>
            </Link>
            <p className="max-w-xs text-cuppi-ink-soft">Your calm and private household app.</p>
            <a href={APP_STORE_URL} target="_blank" rel="noopener noreferrer" aria-label="Download on the App Store" className="inline-block transition-transform duration-300 [transition-timing-function:var(--ease-spring)] hover:scale-105">
              <Image src={APP_STORE_BADGE} alt="Download on the App Store" width={140} height={46} />
            </a>
          </div>

          <FooterColumn title="Features">
            {features.map((f) => (
              <li key={f.slug}>
                <Link href={`/features/${f.slug}`} className={linkClass}>
                  {f.name}
                </Link>
              </li>
            ))}
          </FooterColumn>
          <FooterColumn title="Help">
            {HELP.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className={linkClass}>
                  {l.label}
                </Link>
              </li>
            ))}
          </FooterColumn>
          <FooterColumn title="Legal">
            {LEGAL.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className={linkClass}>
                  {l.label}
                </Link>
              </li>
            ))}
          </FooterColumn>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-cuppi-line pt-6 sm:flex-row">
          <p className="text-sm text-cuppi-ink-soft">&copy; 2026 JackiePoot Creations - Cuppi</p>
          <div className="flex items-center gap-4">
            {SOCIAL.map((s) => (
              <Link key={s.name} href={s.href} target="_blank" rel="noopener noreferrer" aria-label={s.name} className="transition-transform duration-300 [transition-timing-function:var(--ease-spring)] hover:-translate-y-0.5 hover:scale-110">
                <Image src={s.icon} alt="" width={28} height={28} />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-cuppi-ink-soft">{title}</p>
      <ul className="space-y-2">{children}</ul>
    </div>
  );
}
