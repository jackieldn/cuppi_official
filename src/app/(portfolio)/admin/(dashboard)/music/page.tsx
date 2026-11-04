'use client';

import { MusicAdmin } from '@/components/admin/music-admin';

export default function MusicAdminPage() {
  return (
    <div className="container mx-auto px-4 py-12">
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-headline text-4xl font-bold">Music Taste</h1>
      </div>
      <MusicAdmin />
    </div>
  );
}
