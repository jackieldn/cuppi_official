import { sanityClient } from '@/lib/sanity-client';
import { PortableText } from '@/components/portable-text';
import { LegalDocumentLayout } from '@/components/legal/legal-document-layout';
import { Skeleton } from '@/components/ui/skeleton';
import { notFound } from 'next/navigation';

export const revalidate = 60;

type LegalDoc = {
  title: string;
  content: any;
};

function LegalPageSkeleton() {
  return (
    <LegalDocumentLayout title="Loading...">
      <div className="space-y-4">
        <Skeleton className="h-6 w-full" />
        <Skeleton className="h-6 w-full" />
        <Skeleton className="h-6 w-5/6" />
      </div>
    </LegalDocumentLayout>
  );
}

async function getDocument() {
  const slug = 'terms-and-conditions';
  const query = `*[_type == "legal" && slug.current == $slug][0]`;
  try {
    const doc = await sanityClient.fetch<LegalDoc>(query, { slug });
    return doc;
  } catch (error) {
    console.error("Sanity fetch error for slug 'terms-and-conditions':", error);
    return null;
  }
}

export default async function TermsPage() {
  const data = await getDocument();

  if (!data) {
    notFound();
  }

  return (
    <LegalDocumentLayout title={data.title}>
      <PortableText value={data.content} />
    </LegalDocumentLayout>
  );
}

function Loading() {
  return <LegalPageSkeleton />;
}
