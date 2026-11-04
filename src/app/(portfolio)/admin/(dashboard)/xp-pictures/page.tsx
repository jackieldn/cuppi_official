'use client';

import { XpPicturesAdmin } from '@/components/admin/xp-pictures-admin';

export default function XpPicturesAdminPage() {
  return (
    <div className="container mx-auto px-4 py-12">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="font-headline text-4xl font-bold">Poot XP Pictures</h1>
      </div>
      <XpPicturesAdmin />
    </div>
  );
}
