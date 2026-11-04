'use client';

import { JournalAdmin } from '@/components/admin/journal-admin';

export default function JournalAdminPage() {
  return (
    <div className="container mx-auto px-4 py-12">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="font-headline text-4xl font-bold">Journal</h1>
      </div>
      <JournalAdmin />
    </div>
  );
}
