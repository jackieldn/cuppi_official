'use client';

import { useCollection, useFirestore } from '@/firebase';
import { collection, query, orderBy, doc, deleteDoc } from 'firebase/firestore';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { ProjectForm } from './project-form';
import { useState, useMemo } from 'react';
import { Project } from '@/lib/projects';
import { updateDocumentNonBlocking } from '@/firebase';
import { Lock } from 'lucide-react';

export function ProjectList() {
  const firestore = useFirestore();
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  const projectsQuery = useMemo(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'projects'), orderBy('title'));
  }, [firestore]);

  const { data: projects, isLoading } = useCollection<Project>(projectsQuery);

  const handleEditClick = (project: Project) => {
    setEditingProject(project);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleToggleFeatured = (project: Project) => {
    if (!firestore) return;
    const projectRef = doc(firestore, 'projects', project.id);
    updateDocumentNonBlocking(projectRef, { featured: !project.featured });
  };
  
  const handleDelete = async (projectId: string) => {
    if (!firestore) return;
    if(window.confirm('Are you sure you want to delete this project?')) {
        const projectRef = doc(firestore, 'projects', projectId);
        await deleteDoc(projectRef);
    }
  }

  if (isLoading) {
    return <p>Loading projects...</p>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-headline text-2xl font-bold mb-4">
          {editingProject ? 'Edit Project' : 'Add New Project'}
        </h2>
        <ProjectForm
          project={editingProject}
          onFinished={() => setEditingProject(null)}
        />
      </div>

      <h2 className="font-headline text-2xl font-bold">Existing Projects</h2>
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Featured</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {projects?.map((project) => (
              <TableRow key={project.id}>
                <TableCell className="flex items-center gap-2">
                  {project.privacy?.isPasswordProtected && <Lock className="w-4 h-4 text-muted-foreground" />}
                  {project.title}
                </TableCell>
                <TableCell>
                  <Switch
                    checked={!!project.featured}
                    onCheckedChange={() => handleToggleFeatured(project)}
                  />
                </TableCell>
                <TableCell className="text-right space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEditClick(project)}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDelete(project.id)}
                  >
                    Delete
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
