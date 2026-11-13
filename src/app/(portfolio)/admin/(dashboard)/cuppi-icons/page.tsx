'use client';

import { FanAdmin } from '@/components/admin/cuppi/fan-admin';

// Like the Home hero page: one screen tall from lg up, with the preview staying in view while the list scrolls.
export default function CuppiIconsAdminPage() {
  return (
    <div className="flex flex-col gap-4 py-4 lg:h-[calc(100vh-60px)]">
      <div>
        <h1 className="font-headline text-2xl font-bold">Icon banner</h1>
        <p className="text-sm text-muted-foreground">The app icons that slide out of Cuppi&rsquo;s icon on the home page and the Support page: which ones, and in what order.</p>
      </div>
      <div className="lg:min-h-0 lg:flex-1">
        <FanAdmin />
      </div>
    </div>
  );
}
