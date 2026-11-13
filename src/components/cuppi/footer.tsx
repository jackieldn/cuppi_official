import Image from 'next/image';
import Link from 'next/link';
import { getPageFeatures } from '@/lib/features';
import { APP_STORE_URL } from '@/lib/invite';
import { CuppiLogoLink } from './logo-link';
import { ThemeToggle } from './theme-toggle';

// Self-hosted (public/brand): a file on our own domain is cached by the browser for a week, where the
// same file in the Firebase bucket was sent with max-age=0 and re-downloaded on every page view.
const APP_STORE_BADGE = '/brand/app-store-badge.svg';
const SOCIAL = [
  {
    name: 'Facebook',
    href: 'https://www.facebook.com/cuppiapp/',
    icon: '/brand/social-facebook.svg',
  },
  {
    name: 'Bluesky',
    href: 'https://bsky.app/profile/jackiepoot.co.uk',
    icon: '/brand/social-bluesky.svg',
  },
  {
    name: 'X',
    href: 'https://x.com/cuppiapp',
    icon: '/brand/social-x.svg',
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
          {/* The grid stretches this column to the height of the tallest one, so the badge sits at the bottom, level with the last link. */}
          <div className="flex flex-col items-start justify-between gap-6">
            <CuppiLogoLink id="footer" iconWidth={44} iconHeight={46} className="inline-flex items-center gap-3" textClassName="text-2xl" />
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

        {/* Theme toggle at the left, socials at the right, on one line (a phone is too narrow for both, so there they wrap onto two lines, centred).
            They share one height (h-11, 44px) so they sit as a pair. */}
        <div className="mt-10 flex flex-wrap items-center justify-between gap-x-5 gap-y-4 border-t border-cuppi-line pt-6 max-sm:justify-center">
          <ThemeToggle />
          <div className="flex items-center gap-3">
            {SOCIAL.map((s) => (
              <Link key={s.name} href={s.href} target="_blank" rel="noopener noreferrer" aria-label={s.name} className="block transition-transform duration-300 [transition-timing-function:var(--ease-spring)] hover:-translate-y-0.5 hover:scale-110">
                {/* Black discs with a white mark: on the dark footer they flip to cream discs. */}
                <Image src={s.icon} alt="" width={44} height={44} className="size-11 dark:opacity-80 dark:invert" />
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* The legal lines sit under the box, not in it. */}
      <div className="mx-auto mt-5 max-w-6xl space-y-1 px-4 text-center text-xs leading-relaxed text-cuppi-ink-soft">
        <p>&copy; 2026 JackiePoot Creations - Cuppi</p>
        <p>Cuppi and JackiePoot Creations is a trading name of JackiePoot Creations Ltd. ICO Registered: ZC129317</p>
        <p>Registered address 124 City Road, London, EC1V 2NX, United Kingdom</p>
      </div>
    </footer>
  );
}

function FooterColumn({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-3 font-headline text-lg">{title}</p>
      <ul className="space-y-2">{children}</ul>
    </div>
  );
}
