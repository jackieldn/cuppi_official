import { MetadataRoute } from 'next';
import { headers } from 'next/headers';
import { SITE_ORIGINS, hostFromHeaders, portfolioEnabled, siteForHost } from '@/lib/sites';

export default async function robots(): Promise<MetadataRoute.Robots> {
  const site = siteForHost(hostFromHeaders(await headers()));
  const baseUrl = SITE_ORIGINS[site];

  if (site === 'portfolio') {
    return {
      // While the portfolio is switched off there is nothing to crawl.
      rules: portfolioEnabled()
        ? { userAgent: '*', allow: '/', disallow: '/admin' }
        : { userAgent: '*', disallow: '/' },
      sitemap: `${baseUrl}/sitemap.xml`,
    };
  }

  return {
    rules: {
      userAgent: '*',
      allow: '/',
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
