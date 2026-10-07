// Same shape the iOS app accepts (InviteTokenParser.tokenPattern). Anything
// else is never rendered or placed into a link.
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{4,}$/;

export function validInviteToken(candidate: string | string[] | undefined): string | null {
  if (typeof candidate !== 'string') return null;
  return TOKEN_PATTERN.test(candidate) ? candidate : null;
}

export const APP_STORE_URL = 'https://apps.apple.com/gb/app/cuppi/id6754384902';
export const APP_STORE_ID = '6754384902';

export function inviteDeepLink(token: string): string {
  return `homeos://invite?token=${encodeURIComponent(token)}`;
}
