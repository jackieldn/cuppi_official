'use client';

import { CompareAdmin } from '@/components/admin/cuppi/compare-admin';

// Like the Plans page: one screen tall from lg up, with the preview staying in view while the forms scroll.
export default function CuppiCompareAdminPage() {
  return (
    <div className="flex flex-col gap-4 py-4 lg:h-[calc(100vh-60px)]">
      <div>
        <h1 className="font-headline text-2xl font-bold">Comparison</h1>
        <p className="text-sm text-muted-foreground">The comparison page and its snapshots: the facts, where each came from, the privacy cards, the prices and the screenshots.</p>
      </div>
      <div className="lg:min-h-0 lg:flex-1">
        <CompareAdmin />
      </div>
    </div>
  );
}
