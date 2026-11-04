'use client';

import { useCollection, useFirestore } from '@/firebase';
import { collection, query, orderBy, doc, writeBatch } from 'firebase/firestore';
import { PROJECT_SECRETS_COLLECTION } from '@/lib/project-lock';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ProjectForm } from './project-form';
import { useState, useMemo } from 'react';
import { Project } from '@/lib/projects';
import { updateDocumentNonBlocking } from '@/firebase';
import { Lock } from 'lucide-react';

export function ProjectList() {
  const firestore = useFirestore();
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const projectsQuery = useMemo(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'projects'), orderBy('title'));
  }, [firestore]);

  const { data: projects, isLoading } = useCollection<Project>(projectsQuery);

  const handleEditClick = (project: Project) => {
    setEditingProject(project);
    setIsFormOpen(true);
  };

  const handleAddClick = () => {
    setEditingProject(null);
    setIsFormOpen(true);
  };

  const handleFormFinished = () => {
    setIsFormOpen(false);
    setEditingProject(null);
  };

  const handleToggleFeatured = (project: Project) => {
    if (!firestore) return;
    const projectRef = doc(firestore, 'projects', project.id);
    updateDocumentNonBlocking(projectRef, { featured: !project.featured });
  };
  
  const handleDelete = async (projectId: string) => {
    if (!firestore) return;
    if(window.confirm('Are you sure you want to delete this project?')) {
        const batch = writeBatch(firestore);
        batch.delete(doc(firestore, 'projects', projectId));
        // A locked project's content and key hash live here (see src/lib/project-lock.ts).
        batch.delete(doc(firestore, PROJECT_SECRETS_COLLECTION, projectId));
        await batch.commit();
    }
  }

  if (isLoading) {
    return <p>Loading projects...</p>;
  }

  return (
    <div className="space-y-8">
      <Dialog open={isFormOpen} onOpenChange={(open) => { if (!open) handleFormFinished(); }}>
        <DialogContent
          className="max-w-4xl max-h-[90vh] overflow-y-auto"
          // Clicking outside would silently throw away an in-progress edit.
          onInteractOutside={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle className="font-headline text-2xl">
              {editingProject ? 'Edit Project' : 'Add New Project'}
            </DialogTitle>
            <DialogDescription className="sr-only">
              {editingProject ? `Edit ${editingProject.title}` : 'Add a new project'}
            </DialogDescription>
          </DialogHeader>
          <ProjectForm project={editingProject} onFinished={handleFormFinished} />
        </DialogContent>
      </Dialog>

      <div className="flex items-center justify-between">
        <h2 className="font-headline text-2xl font-bold">Existing Projects</h2>
        <Button onClick={handleAddClick}>Add Project</Button>
      </div>
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
