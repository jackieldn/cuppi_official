'use client';

import { DisclaimersAdmin } from '@/components/admin/cuppi/disclaimers-admin';

export default function CuppiDisclaimersAdminPage() {
  return (
    <div className="container mx-auto max-w-3xl space-y-8 px-4 py-12">
      <div>
        <h1 className="font-headline text-4xl font-bold">Disclaimers</h1>
        <p className="mt-2 text-muted-foreground">The notices behind the small (i) icons on the Cuppi website, such as for health and medication features.</p>
      </div>
      <DisclaimersAdmin />
    </div>
  );
}
