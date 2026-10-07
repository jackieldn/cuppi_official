import type { Metadata } from 'next';
import { InviteLanding } from '@/components/cuppi/invite-landing';
import { validInviteToken } from '@/lib/invite';
import { inviteMetadata } from '@/lib/invite-metadata';

// Query-style invite link: /invite?token=<token>
type Props = { searchParams: Promise<{ token?: string | string[] }> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { token } = await searchParams;
  return inviteMetadata(validInviteToken(token));
}

export default async function InvitePage({ searchParams }: Props) {
  const { token } = await searchParams;
  return <InviteLanding token={validInviteToken(token)} />;
}
