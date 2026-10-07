import { NextResponse, type NextRequest } from 'next/server';
import {
  CUPPI_PATHS,
  PORTFOLIO_PATHS,
  hostFromHeaders,
  originForSite,
  portfolioEnabled,
  siteForHost,
} from '@/lib/sites';

// Two sites share this app. This decides which one a request belongs to (see
// src/lib/sites.ts) so each domain only ever serves its own pages:
//   cuppi.co.uk      Cuppi. Portfolio paths are redirected to jackiepoot.co.uk.
//   jackiepoot.co.uk the portfolio, with / shown as the portfolio home.
//                    Cuppi paths are redirected to cuppi.co.uk.
const AASA_PATH = '/.well-known/apple-app-site-association';

export function middleware(request: NextRequest) {
  const { pathname, search, protocol } = request.nextUrl;
  const host = hostFromHeaders(request.headers);
  const site = siteForHost(host);
  const first = pathname.split('/')[1] ?? '';

  const redirectTo = (target: 'cuppi' | 'portfolio', path: string) =>
    NextResponse.redirect(`${originForSite(target, host, protocol)}${path}${search}`, 308);

  if (site === 'cuppi') {
    // Old portfolio links on cuppi.co.uk move to the portfolio's own domain.
    if (first === 'portfolio') return redirectTo('portfolio', '/');
    if (PORTFOLIO_PATHS.includes(first)) return redirectTo('portfolio', pathname);
    return NextResponse.next();
  }

  // The app's universal-link file belongs to cuppi.co.uk alone.
  if (pathname === AASA_PATH) return new NextResponse(null, { status: 404 });

  if (CUPPI_PATHS.includes(first)) return redirectTo('cuppi', pathname);

  // Portfolio switched off: holding page for everything except /admin, so the
  // content can still be edited before it goes live again.
  if (!portfolioEnabled() && first !== 'admin' && first !== 'offline') {
    return NextResponse.rewrite(new URL('/offline', request.url));
  }

  // /portfolio is the portfolio's home page, shown at / on its own domain.
  if (pathname === '/') return NextResponse.rewrite(new URL('/portfolio', request.url));
  if (first === 'portfolio') return redirectTo('portfolio', '/');

  return NextResponse.next();
}

export const config = {
  // robots.txt and sitemap.xml pick their site from the hostname themselves.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)'],
};
