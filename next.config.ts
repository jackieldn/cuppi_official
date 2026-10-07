import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  output: "standalone",
  poweredByHeader: false,
  // Baseline security headers for both sites. A full script-src CSP needs a
  // nonce setup (reCAPTCHA, Firebase, Sanity), so only the directives that are
  // safe without one are enforced here.
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Strict-Transport-Security', value: 'max-age=31536000' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
          {
            key: 'Content-Security-Policy',
            value: "frame-ancestors 'none'; base-uri 'self'; object-src 'none'; form-action 'self'",
          },
        ],
      },
    ];
  },
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
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    // next/image fetches and re-encodes these on demand, so keep the list to
    // sources we control. Allowing all of firebasestorage.googleapis.com would
    // let anyone have the optimizer fetch files from their own bucket.
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
        port: '',
        pathname: '/v0/b/studio-5700093446-89b93.firebasestorage.app/**',
      },
      {
        protocol: 'https',
        hostname: 'cdn.sanity.io',
        port: '',
        pathname: '/images/0uvqbyjc/**',
      },
    ],
  },
};

export default nextConfig;
