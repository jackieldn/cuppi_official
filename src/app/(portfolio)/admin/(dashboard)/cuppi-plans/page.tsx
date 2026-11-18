'use client';

import { PlansAdmin } from '@/components/admin/cuppi/plans-admin';

// Like the Icon banner page: one screen tall from lg up, with the preview staying in view while the lists scroll.
export default function CuppiPlansAdminPage() {
  return (
    <div className="flex flex-col gap-4 py-4 lg:h-[calc(100vh-60px)]">
      <div>
        <h1 className="font-headline text-2xl font-bold">Plans</h1>
        <p className="text-sm text-muted-foreground">The Plans page: the prices, and what Free and Pro each get, with a table for each feature you add.</p>
      </div>
      <div className="lg:min-h-0 lg:flex-1">
        <PlansAdmin />
      </div>
    </div>
  );
}
