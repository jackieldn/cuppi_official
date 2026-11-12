'use client';

import { MenuAdmin } from '@/components/admin/cuppi/menu-admin';

export default function CuppiMenuAdminPage() {
  return (
    <div className="container mx-auto max-w-4xl space-y-8 px-4 py-12">
      <div>
        <h1 className="font-headline text-4xl font-bold">Cuppi menu</h1>
        <p className="mt-2 text-muted-foreground">The bar at the top of the Cuppi website: its links, and the Download button.</p>
      </div>
      <MenuAdmin />
    </div>
  );
}
