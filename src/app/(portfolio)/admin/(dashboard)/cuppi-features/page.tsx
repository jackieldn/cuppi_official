'use client';

import { FeaturesAdmin } from '@/components/admin/cuppi/features-admin';

export default function CuppiFeaturesAdminPage() {
  return (
    <div className="container mx-auto max-w-4xl space-y-8 px-4 py-12">
      <div>
        <h1 className="font-headline text-4xl font-bold">Cuppi features</h1>
        <p className="mt-2 text-muted-foreground">
          The in-app features shown on the Cuppi website. Add one and it is listed in the top menu automatically; switch it off to hide it.
        </p>
      </div>
      <FeaturesAdmin />
    </div>
  );
}
