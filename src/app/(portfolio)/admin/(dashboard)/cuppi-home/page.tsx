'use client';

import { HeroAdmin } from '@/components/admin/cuppi/hero-admin';

// From lg up the page is exactly one screen tall (under the 60px header) and its two columns scroll on
// their own, so the preview stays in view while the settings are worked through.
export default function CuppiHomeAdminPage() {
  return (
    <div className="flex flex-col gap-4 py-4 lg:h-[calc(100vh-60px)]">
      <div>
        <h1 className="font-headline text-2xl font-bold">Home hero</h1>
        <p className="text-sm text-muted-foreground">The big block at the top of the Cuppi home page: pick a template, then change the words, colour, pattern, phone and opening animation.</p>
      </div>
      <div className="lg:min-h-0 lg:flex-1">
        <HeroAdmin />
      </div>
    </div>
  );
}
