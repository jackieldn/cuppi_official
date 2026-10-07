'use client';

import { FreeTimeAdmin } from '@/components/admin/free-time-admin';

export default function FreeTimeAdminPage() {
  return (
    <div className="container mx-auto px-4 py-12">
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-headline text-4xl font-bold">Free time Gallery</h1>
      </div>
      <FreeTimeAdmin />
    </div>
  );
}
