'use client';

import { AppList } from '@/components/admin/apps/app-list';

export default function AppsAdminPage() {
  return (
    <div className="container mx-auto px-4 py-12">
      <div className="mb-8">
        <h1 className="font-headline text-4xl font-bold">Apps & Websites</h1>
      </div>
      <AppList />
    </div>
  );
}
