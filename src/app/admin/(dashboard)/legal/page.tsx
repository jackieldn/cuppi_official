'use client';

import { LegalDocsAdmin } from '@/components/admin/legal/legal-docs-admin';

export default function LegalAdminPage() {
  return (
    <div className="container mx-auto px-4 py-12 space-y-12">
      <h1 className="font-headline text-4xl font-bold">Manage Legal Documents</h1>
      
      <section>
        <LegalDocsAdmin />
      </section>
    </div>
  );
}
