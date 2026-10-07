import { MetadataRoute } from 'next';
import { sanityClient } from '@/lib/sanity-client';
import { getApps } from '@/lib/apps-data';
import { CosyCornerPost } from '@/lib/blog-types';
import { App } from '@/lib/about-types';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://cuppi.co.uk';

  // 1. Get dynamic routes from Sanity (Blog Posts)
  const posts = await sanityClient.fetch<Pick<CosyCornerPost, 'slug' | '_createdAt'>[]>(
    `*[_type == "cosyCorner" && defined(slug.current)]{ slug, _createdAt }`
  );
  const postUrls = posts.map(post => ({
    url: `${baseUrl}/blog/${post.slug.current}`,
    lastModified: new Date(post._createdAt),
    changeFrequency: 'monthly' as 'monthly',
    priority: 0.8,
  }));

  // 2. Get dynamic routes from Firestore (Apps)
  const apps = await getApps();
  const appUrls = apps.map(app => ({
    url: `${baseUrl}/apps/${app.slug}`,
    lastModified: new Date(app.releaseDate),
    changeFrequency: 'monthly' as 'monthly',
    priority: 0.7,
  }));

  // 3. Define static routes
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

  return [...staticUrls, ...postUrls, ...appUrls];
}
