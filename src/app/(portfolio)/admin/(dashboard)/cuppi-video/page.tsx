'use client';

import { HomeVideoAdmin } from '@/components/admin/cuppi/home-video-admin';

export default function CuppiHomeVideoAdminPage() {
  return (
    <div className="container mx-auto max-w-3xl space-y-8 px-4 py-12">
      <div>
        <h1 className="font-headline text-4xl font-bold">Home video</h1>
        <p className="mt-2 text-muted-foreground">The latest advert, shown on the Cuppi home page under What&rsquo;s new. Upload a video and add a title, description and a button to a feature if you like.</p>
      </div>
      <HomeVideoAdmin />
    </div>
  );
}
