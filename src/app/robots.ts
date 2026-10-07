import { MetadataRoute } from 'next';
 
export default function robots(): MetadataRoute.Robots {
  const baseUrl = 'https://cuppi.co.uk';

  return {
    rules: {
      userAgent: '*',
      allow: '/',
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
