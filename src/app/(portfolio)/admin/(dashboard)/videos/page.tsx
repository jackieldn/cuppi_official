'use client';

import { DesktopVideosAdmin } from '@/components/admin/desktop-videos-admin';

export default function DesktopVideosAdminPage() {
  return (
    <div className="container mx-auto px-4 py-12">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="font-headline text-4xl font-bold">Desktop Videos</h1>
      </div>
      <DesktopVideosAdmin />
    </div>
  );
}
