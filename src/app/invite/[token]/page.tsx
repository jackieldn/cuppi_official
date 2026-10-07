import type { Metadata } from 'next';
import { InviteLanding } from '@/components/cuppi/invite-landing';
import { validInviteToken } from '@/lib/invite';
import { inviteMetadata } from '@/lib/invite-metadata';

// Path-style invite link: /invite/<token>
type Props = { params: Promise<{ token: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params;
  return inviteMetadata(validInviteToken(token));
}

export default async function InviteTokenPage({ params }: Props) {
  const { token } = await params;
  return <InviteLanding token={validInviteToken(token)} />;
}
