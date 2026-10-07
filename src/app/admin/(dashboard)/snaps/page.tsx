'use client';

import { SnapsGalleryAdmin } from '@/components/admin/snaps-gallery-admin';

export default function SnapsAdminPage() {
  return (
    <div className="container mx-auto px-4 py-12">
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-headline text-4xl font-bold">Snaps Gallery</h1>
      </div>
      <SnapsGalleryAdmin />
    </div>
  );
}
