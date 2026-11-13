'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { FeaturePageAdmin } from '@/components/admin/cuppi/feature-page-admin';

// Like the home hero editor: from lg up the page is exactly one screen tall (under the 60px header) and
// its two columns scroll on their own, so the preview stays in view while the sections are worked through.
export default function CuppiFeaturePageAdminPage() {
  const { slug } = useParams<{ slug: string }>();
  return (
    <div className="flex flex-col gap-4 py-4 lg:h-[calc(100vh-60px)]">
      <div>
        <Link href="/admin/cuppi-features" className="mb-1 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" /> Cuppi features
        </Link>
        <h1 className="font-headline text-2xl font-bold">Page sections</h1>
        <p className="text-sm text-muted-foreground">Build the page below the top block: add a section from a template, fill it in, and watch it appear in the preview.</p>
      </div>
      <div className="lg:min-h-0 lg:flex-1">
        <FeaturePageAdmin slug={slug} />
      </div>
    </div>
  );
}
