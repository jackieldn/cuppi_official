'use client';

import { WorksGallery } from "@/components/works/works-gallery";
import { useCollection, useFirestore } from '@/firebase';
import { Project } from '@/lib/projects';
import { collection, orderBy, query } from 'firebase/firestore';
import { useMemo } from 'react';

export default function WorksPage() {
  const firestore = useFirestore();

  const projectsQuery = useMemo(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'projects'), orderBy('title'));
  }, [firestore]);

  const { data: projects, isLoading } = useCollection<Project>(projectsQuery);

  return (
    <div className="relative flex flex-col">
      <main className="flex-1">
        <WorksGallery initialProjects={projects} isLoading={isLoading} />
      </main>
    </div>
  );
}
