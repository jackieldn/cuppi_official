import { securityTxt } from '@/lib/security-txt';

// Same arrangement as /aasa: App Router will not route a dot-prefixed folder,
// so this lives at /security-txt and next.config.ts rewrites
// /.well-known/security.txt to it. The rewrite is internal, so the file is
// served at the well-known path itself, with no redirect.
export const dynamic = 'force-static';

export function GET() {
  return new Response(securityTxt(), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
