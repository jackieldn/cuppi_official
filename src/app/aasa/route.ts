import { aasa } from '@/lib/aasa';

// Next.js App Router will not route a folder starting with a dot, so this
// handler lives at /aasa and next.config.ts rewrites
// /.well-known/apple-app-site-association to it. The rewrite is internal, so
// Apple sees the well-known path itself: no redirect, no file extension.
export const dynamic = 'force-static';

export function GET() {
  return new Response(JSON.stringify(aasa), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
