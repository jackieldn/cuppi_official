import type { Metadata } from 'next';
import { APP_STORE_ID, inviteDeepLink } from '@/lib/invite';

// Invite pages carry a bearer token in the URL: keep them out of search
// indexes and do not send the URL on as a referrer. The Smart App Banner gives
// Safari an "Open" button that hands the token straight to the app.
export function inviteMetadata(token: string | null): Metadata {
  return {
    title: token ? "You're invited to Cuppi" : 'Invite link not valid',
    robots: { index: false, follow: false },
    referrer: 'no-referrer',
    other: token
      ? { 'apple-itunes-app': `app-id=${APP_STORE_ID}, app-argument=${inviteDeepLink(token)}` }
      : {},
  };
}
