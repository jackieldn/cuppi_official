'use client';

import { PagesAdmin } from '@/components/admin/cuppi/pages-admin';

export default function CuppiPagesAdminPage() {
  return (
    <div className="container mx-auto max-w-4xl space-y-8 px-4 py-12">
      <div>
        <h1 className="font-headline text-4xl font-bold">Cuppi pages</h1>
        <p className="mt-2 text-muted-foreground">Turn parts of the Cuppi website on and off while they are being updated.</p>
      </div>
      <PagesAdmin />
    </div>
  );
}
