'use client';

import { BannersAdmin } from '@/components/admin/cuppi/banners-admin';

export default function CuppiBannersAdminPage() {
  return (
    <div className="container mx-auto max-w-3xl space-y-8 px-4 py-12">
      <div>
        <h1 className="font-headline text-4xl font-bold">Banners</h1>
        <p className="mt-2 text-muted-foreground">Temporary notices just under the Cuppi website&rsquo;s menu. Schedule them with a start and end date, and they appear and disappear by themselves.</p>
      </div>
      <BannersAdmin />
    </div>
  );
}
