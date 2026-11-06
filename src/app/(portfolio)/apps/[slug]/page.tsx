'use client';

import { notFound, useParams } from "next/navigation";
import { useMemo } from 'react';
import { collection, query, where } from 'firebase/firestore';
import { useFetchCollection } from '@/firebase';
import { useFirestore } from '@/firebase/provider';
import { AppDetail } from '@/components/apps/app-detail';
import { normalizeApp } from '@/lib/showcase';

export default function AppDetailsPage() {
  const firestore = useFirestore();
  const params = useParams();
  const slug = params.slug as string;

  const appsQuery = useMemo(() => {
    if (!firestore || !slug) return null;
    return query(collection(firestore, 'apps'), where('slug', '==', slug));
  }, [firestore, slug]);

  const { data: docs, isLoading } = useFetchCollection<Record<string, any>>(appsQuery);
  const app = useMemo(() => (docs?.[0] ? normalizeApp(docs[0]) : null), [docs]);

  // No placeholder boxes while loading: the page is blank, then the content fades up.
  if (isLoading) {
    return <div className="min-h-screen" />;
  }

  if (!app) {
    notFound();
  }

  return <AppDetail app={app} />;
}
