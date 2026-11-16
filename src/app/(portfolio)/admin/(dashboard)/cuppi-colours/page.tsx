'use client';

import { ColoursAdmin } from '@/components/admin/cuppi/colours-admin';

export default function CuppiColoursAdminPage() {
  return (
    <div className="container mx-auto max-w-7xl space-y-8 px-4 py-12">
      <div>
        <h1 className="font-headline text-4xl font-bold">Colours</h1>
        <p className="mt-2 max-w-3xl text-muted-foreground">
          The Cuppi website&rsquo;s base colours, for light and dark: the page, the boxes on it, text, orange, the colour blocks and tints. Change them and watch the previews. Nothing reaches the site until you save with &ldquo;Use these colours on the site&rdquo; switched on.
        </p>
      </div>
      <ColoursAdmin />
    </div>
  );
}
