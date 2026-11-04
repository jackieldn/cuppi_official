'use client';

import { PlayerTracksAdmin } from '@/components/admin/player-tracks-admin';

export default function PlayerAdminPage() {
  return (
    <div className="container mx-auto px-4 py-12">
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-headline text-4xl font-bold">Music Player</h1>
      </div>
      <PlayerTracksAdmin />
    </div>
  );
}
