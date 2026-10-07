import { MetadataRoute } from 'next';
import { headers } from 'next/headers';
import { sanityClient } from '@/lib/sanity-client';
import { CosyCornerPost } from '@/lib/blog-types';
import { SITE_ORIGINS, hostFromHeaders, portfolioEnabled, siteForHost } from '@/lib/sites';

async function cuppiSitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = SITE_ORIGINS.cuppi;

  // Blog posts from Sanity
  const posts = await sanityClient.fetch<Pick<CosyCornerPost, 'slug' | '_createdAt'>[]>(
    `*[_type == "cosyCorner" && defined(slug.current)]{ slug, _createdAt }`
  );
  const postUrls = posts.map(post => ({
    url: `${baseUrl}/blog/${post.slug.current}`,
    lastModified: new Date(post._createdAt),
    changeFrequency: 'monthly' as 'monthly',
    priority: 0.8,
  }));

  const staticRoutes = [
    '/',
    '/blog',
    '/faq',
    '/support',
    '/terms',
    '/privacy',
    '/family-safety'
  ];

  const staticUrls = staticRoutes.map(route => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as 'weekly',
    priority: route === '/' ? 1.0 : 0.5,
  }));

  return [...staticUrls, ...postUrls];
}

async function portfolioSitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = SITE_ORIGINS.portfolio;
  if (!portfolioEnabled()) return [];

  // Apps from Firestore. Imported here so Cuppi's sitemap never depends on
  // Firebase Admin being configured.
  const { getApps } = await import('@/lib/apps-data');
  const apps = await getApps();
  const appUrls = apps.map(app => ({
    url: `${baseUrl}/apps/${app.slug}`,
    lastModified: new Date(app.releaseDate),
    changeFrequency: 'monthly' as 'monthly',
    priority: 0.7,
  }));

  const staticRoutes = ['/', '/works', '/snaps', '/free-time', '/apps', '/about'];
  const staticUrls = staticRoutes.map(route => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: 'monthly' as 'monthly',
    priority: route === '/' ? 1.0 : 0.6,
  }));

  return [...staticUrls, ...appUrls];
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const site = siteForHost(hostFromHeaders(await headers()));
  return site === 'portfolio' ? portfolioSitemap() : cuppiSitemap();
}
