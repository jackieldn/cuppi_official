// One codebase, two websites. Which one a request gets is decided by hostname.
//   cuppi    -> cuppi.co.uk       (the app's site: src/app/(cuppi))
//   portfolio -> jackiepoot.co.uk (Jack's portfolio: src/app/(portfolio))
// Any host that is not the portfolio's (App Hosting's default domain, plain
// localhost, previews) gets Cuppi, because Cuppi is the site that matters.

export type Site = 'cuppi' | 'portfolio';

export const SITE_ORIGINS: Record<Site, string> = {
  cuppi: 'https://cuppi.co.uk',
  portfolio: 'https://jackiepoot.co.uk',
};

export function siteForHost(host: string | null | undefined): Site {
  return (host ?? '').toLowerCase().includes('jackiepoot') ? 'portfolio' : 'cuppi';
}

// Behind Firebase's CDN the original hostname arrives in x-forwarded-host.
export function hostFromHeaders(headers: Headers): string {
  return headers.get('x-forwarded-host') ?? headers.get('host') ?? '';
}

// Local development: `localhost:3000` is Cuppi and `jackiepoot.localhost:3000`
// is the portfolio (browsers resolve *.localhost without any hosts-file edit).
// Everywhere else, cross-site redirects go to the real production origins.
export function originForSite(site: Site, currentHost: string, protocol: string): string {
  const host = currentHost.toLowerCase();
  if (host.includes('localhost')) {
    const base = host.replace(/^jackiepoot\./, '');
    return `${protocol}//${site === 'portfolio' ? `jackiepoot.${base}` : base}`;
  }
  return SITE_ORIGINS[site];
}

// Top-level path segments that belong to each site. The middleware uses these
// to keep each domain serving only its own pages.
export const CUPPI_PATHS = [
  'blog',
  'faq',
  'support',
  'terms',
  'privacy',
  'family-safety',
  'pricing',
  'beta-program-policy',
  'invite',
  'aasa',
];

export const PORTFOLIO_PATHS = [
  'portfolio',
  'works',
  'snaps',
  'free-time',
  'apps',
  'about',
  'admin',
  'offline',
];

// The portfolio is only needed while job hunting. Set PORTFOLIO_ENABLED=false
// (apphosting.yaml) and jackiepoot.co.uk shows a holding page instead.
export function portfolioEnabled(): boolean {
  return process.env.PORTFOLIO_ENABLED !== 'false';
}
