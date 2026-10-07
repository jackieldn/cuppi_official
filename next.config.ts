import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  output: "standalone",
  // Apple fetches the AASA file from exactly this path, with no redirect. App
  // Router cannot route a dot-prefixed folder, so serve it from /aasa.
  async rewrites() {
    return [
      { source: '/.well-known/apple-app-site-association', destination: '/aasa' },
    ];
  },
  // The old /cuppi and /homeos sections were emptied out and left as blank
  // pages. Send anything still linking to them to the real pages.
  async redirects() {
    const legacy = ['cuppi', 'homeos'];
    const pages = ['faq', 'privacy', 'terms', 'beta-program-policy'];
    return legacy.flatMap((prefix) => [
      { source: `/${prefix}`, destination: '/', permanent: true },
      ...pages.map((page) => ({
        source: `/${prefix}/${page}`,
        destination: `/${page}`,
        permanent: true,
      })),
    ]);
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https' ,
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'cdn.sanity.io',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
