'use client';

import { ProjectList } from '@/components/admin/project-list';

export default function AdminDashboard() {
  return (
    <div className="container mx-auto px-4 py-12">
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-headline text-4xl font-bold">Projects</h1>
      </div>
      <ProjectList />
    </div>
  );
}
