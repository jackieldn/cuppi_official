import { sanityClient } from '@/lib/sanity-client';
import { PortableText } from '@/components/portable-text';
import { LegalDocumentLayout } from '@/components/legal/legal-document-layout';
import { Skeleton } from '@/components/ui/skeleton';
import { notFound } from 'next/navigation';

// Revalidate this page every 60 seconds
export const revalidate = 60;

// Define the type for our Sanity document
type LegalDoc = {
  title: string;
  content: any; // Portable Text content
};

function LegalPageSkeleton() {
  return (
    <LegalDocumentLayout title="Loading...">
      <div className="space-y-4">
        <Skeleton className="h-6 w-full" />
        <Skeleton className="h-6 w-full" />
        <Skeleton className="h-6 w-5/6" />
        <Skeleton className="h-6 w-full" />
        <Skeleton className="h-6 w-3/4" />
      </div>
    </LegalDocumentLayout>
  );
}


async function getDocument() {
  // The slug to fetch from Sanity, matching the 'slug' field in your Sanity schema
  const slug = 'privacy-policy';
  
  // The GROQ query
  const query = `*[_type == "legal" && slug.current == $slug][0]`;
  
  try {
    // Fetch the data from Sanity
    const doc = await sanityClient.fetch<LegalDoc>(query, { slug });
    return doc;
  } catch (error) {
    console.error("Sanity fetch error for slug 'privacy-policy':", error);
    return null; // Return null on fetch error
  }
}

export default async function PrivacyPage() {
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

// Add a loading component for a better user experience during ISR revalidation
export function Loading() {
  return <LegalPageSkeleton />;
}
