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
import { ArrowDown, ArrowUp, ArrowUpDown, BadgeCheck, Film, ImageIcon, Images, Lock, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

// At-a-glance "is this filled out?" markers; faded when empty.
function StatusIcon({ icon: Icon, active, label, count }: {
  icon: React.ComponentType<{ className?: string }>;
  active: boolean;
  label: string;
  count?: number;
}) {
  return (
    <span
      title={label}
      aria-label={label}
      role="img"
      className={cn('inline-flex items-center gap-0.5 text-xs', active ? 'text-foreground' : 'text-muted-foreground/30')}
    >
      <Icon className="h-4 w-4" />
      {active && count !== undefined && count > 1 && <span>{count}</span>}
    </span>
  );
}

function ProjectStatusIcons({ project }: { project: Project }) {
  const videos = project.videoUrls?.length ?? 0;
  const gallery = project.galleryImages?.length ?? 0;
  const hasDisclaimer = !!project.aiDisclaimer?.trim();
  return (
    <span className="inline-flex items-center gap-2">
      <StatusIcon icon={ImageIcon} active={!!project.imageUrl} label={project.imageUrl ? 'Cover image set' : 'No cover image'} />
      <StatusIcon icon={Film} active={videos > 0} count={videos} label={videos ? `${videos} video${videos === 1 ? '' : 's'}` : 'No videos'} />
      <StatusIcon icon={Images} active={gallery > 0} count={gallery} label={gallery ? `${gallery} gallery image${gallery === 1 ? '' : 's'}` : 'No gallery images'} />
      <StatusIcon icon={BadgeCheck} active={!!project.noAi} label={project.noAi ? 'Marked as no generative AI' : 'Not marked as no-AI'} />
      <StatusIcon icon={Sparkles} active={hasDisclaimer} label={hasDisclaimer ? 'AI disclaimer written' : 'No AI disclaimer'} />
    </span>
  );
}

type SortKey = 'title' | 'content' | 'year' | 'featured';
type SortDir = 'asc' | 'desc';

// How many of the five content indicators are filled out.
const contentScore = (p: Project) =>
  Number(!!p.imageUrl) +
  Number((p.videoUrls?.length ?? 0) > 0) +
  Number((p.galleryImages?.length ?? 0) > 0) +
  Number(!!p.noAi) +
  Number(!!p.aiDisclaimer?.trim());

const compareText = (a: string, b: string) => a.localeCompare(b, undefined, { sensitivity: 'base', numeric: true });

function SortableHead({ label, sortKey, sort, onSort, ascLabel, descLabel }: {
  label: string;
  sortKey: SortKey;
  sort: { key: SortKey; dir: SortDir };
  onSort: (key: SortKey) => void;
  ascLabel: string;
  descLabel: string;
}) {
  const active = sort.key === sortKey;
  const Icon = !active ? ArrowUpDown : sort.dir === 'asc' ? ArrowUp : ArrowDown;
  return (
    <TableHead aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className="-ml-2 inline-flex items-center gap-1 rounded px-2 py-1 hover:bg-muted"
        title={`Sort ${active && sort.dir === 'asc' ? descLabel : ascLabel}`}
      >
        {label}
        <Icon className={cn('h-3.5 w-3.5', !active && 'text-muted-foreground/50')} />
        {active && <span className="text-xs font-normal text-muted-foreground">{sort.dir === 'asc' ? ascLabel : descLabel}</span>}
      </button>
    </TableHead>
  );
}

export function ProjectList() {
  const firestore = useFirestore();
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({ key: 'title', dir: 'asc' });

  const handleSort = (key: SortKey) =>
    setSort((prev) => (prev.key === key ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }));

  const projectsQuery = useMemo(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'projects'), orderBy('title'));
  }, [firestore]);

  const { data: projects, isLoading } = useCollection<Project>(projectsQuery);

  const sortedProjects = useMemo(() => {
    if (!projects) return projects;
    const sign = sort.dir === 'asc' ? 1 : -1;
    return [...projects].sort((a, b) => {
      // Projects with no delivery year always sink to the bottom, whichever way we sort.
      if (sort.key === 'year') {
        const ay = a.deliveryYear?.trim() ?? '';
        const by = b.deliveryYear?.trim() ?? '';
        if (!ay !== !by) return ay ? -1 : 1;
        const diff = compareText(ay, by);
        if (diff) return diff * sign;
      } else if (sort.key === 'content') {
        const diff = contentScore(a) - contentScore(b);
        if (diff) return diff * sign;
      } else if (sort.key === 'featured') {
        const diff = Number(!!a.featured) - Number(!!b.featured);
        if (diff) return diff * sign;
      } else {
        return compareText(a.title ?? '', b.title ?? '') * sign;
      }
      return compareText(a.title ?? '', b.title ?? '');
    });
  }, [projects, sort]);

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
        const projectRef = doc(firestore, 'projects', projectId);
        await deleteDoc(projectRef);
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
              <SortableHead label="Title" sortKey="title" sort={sort} onSort={handleSort} ascLabel="A-Z" descLabel="Z-A" />
              <SortableHead label="Content" sortKey="content" sort={sort} onSort={handleSort} ascLabel="Least first" descLabel="Most first" />
              <SortableHead label="Year" sortKey="year" sort={sort} onSort={handleSort} ascLabel="Oldest first" descLabel="Newest first" />
              <SortableHead label="Featured" sortKey="featured" sort={sort} onSort={handleSort} ascLabel="No first" descLabel="Yes first" />
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedProjects?.map((project) => (
              <TableRow key={project.id}>
                <TableCell>
                  <span className="flex items-center gap-2">
                    {project.privacy?.isPasswordProtected && <Lock className="w-4 h-4 text-muted-foreground" />}
                    {project.title}
                  </span>
                </TableCell>
                <TableCell>
                  <ProjectStatusIcons project={project} />
                </TableCell>
                <TableCell className="tabular-nums">
                  {project.deliveryYear || <span className="text-muted-foreground/40">—</span>}
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
