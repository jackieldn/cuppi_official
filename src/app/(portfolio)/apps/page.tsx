'use client';

import { useMemo } from 'react';
import { collection, query } from 'firebase/firestore';
import { AppGallery } from '@/components/apps/app-gallery';
import { useCollection, useFirestore } from '@/firebase';
import { normalizeApp } from '@/lib/showcase';

export default function AppsPage() {
  const firestore = useFirestore();

  const appsQuery = useMemo(() => (firestore ? query(collection(firestore, 'apps')) : null), [firestore]);
  const { data, isLoading } = useCollection<Record<string, any>>(appsQuery);

  // Entries saved before the redesign are mapped onto the current shape here.
  const apps = useMemo(() => (data ? data.map((d) => normalizeApp(d)) : null), [data]);

  return (
    <div className="relative flex flex-col">
      <main className="flex-1">
        <AppGallery apps={apps} isLoading={isLoading} />
      </main>
    </div>
  );
}
