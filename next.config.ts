import type {NextConfig} from 'next';

const DAY = 60 * 60 * 24;
const IMAGE_CSP = "default-src 'self'; script-src 'none'; sandbox;";

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
      // Resized and proxied pictures (see `images` below). The baseline policy above would replace the
      // image one, so repeat it here: it stops script in an SVG from running if one is ever opened directly.
      {
        source: '/_next/image',
        headers: [{ key: 'Content-Security-Policy', value: IMAGE_CSP }],
      },
      // Pictures that ship with the site. Next serves files from /public with max-age=0, which makes
      // a browser ask the server about every one of them on every use (a round trip per icon, which
      // is what made the icons seem to reload on a phone). A week, then quietly refreshed in the
      // background for a month. If you replace one of these files, give it a new name.
      ...['icons', 'patterns', 'phone-frames', 'images', 'brand'].map((dir) => ({
        source: `/${dir}/:path*`,
        headers: [{ key: 'Cache-Control', value: `public, max-age=${7 * DAY}, stale-while-revalidate=${30 * DAY}` }],
      })),
    ];
  },
  // Apple fetches the AASA file from exactly this path, with no redirect. App
  // Router cannot route a dot-prefixed folder, so serve it from /aasa.
  // security.txt (RFC 9116) is served the same way, from /security-txt.
  async rewrites() {
    return [
      { source: '/.well-known/apple-app-site-association', destination: '/aasa' },
      { source: '/.well-known/security.txt', destination: '/security-txt' },
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
    // How long a resized picture is kept (by the browser and by our server). The default is 60 seconds,
    // so every minute the browser would ask again. Pictures here barely change, and a changed picture
    // gets a new address (Firebase tokens, new file names), so a week is safe.
    minimumCacheTTL: 7 * DAY,
    // Feature icons are SVGs uploaded in the admin (Firebase Storage). By default next/image does not
    // proxy an SVG, so the browser fetched each one straight from Firebase, which sends them as
    // `private, max-age=0`: never cached, 300 to 800ms each, so the menu icons arrived late on every
    // open. Allowing SVG sends them through our own cache like every other picture. This is the
    // recommended lock-down for that: the optimizer only fetches from the sources listed below, and
    // each response carries a policy that stops any script inside an SVG from running.
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: IMAGE_CSP,
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
