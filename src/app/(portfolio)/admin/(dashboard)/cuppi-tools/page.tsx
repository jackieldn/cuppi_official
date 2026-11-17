'use client';

import { ToolsAdmin } from '@/components/admin/cuppi/tools-admin';

export default function CuppiToolsAdminPage() {
  return (
    <div className="container mx-auto max-w-4xl space-y-8 px-4 py-12">
      <div>
        <h1 className="font-headline text-4xl font-bold">Cuppi tools</h1>
        <p className="mt-2 text-muted-foreground">The free calculators at cuppi.co.uk/tools: switch them on and off, choose which are in the menu, and set their icons and order.</p>
      </div>
      <ToolsAdmin />
    </div>
  );
}
