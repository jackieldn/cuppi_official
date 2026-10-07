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
import { AppForm } from './app-form';
import { useState, useMemo } from 'react';
import { App } from '@/lib/about-types';
import { useToast } from '@/hooks/use-toast';
import { deleteObject, ref } from 'firebase/storage';
import { useStorage } from '@/firebase';

export function AppList() {
  const firestore = useFirestore();
  const storage = useStorage();
  const { toast } = useToast();
  const [editingApp, setEditingApp] = useState<App | null>(null);

  const appsQuery = useMemo(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'apps'), orderBy('releaseDate', 'desc'));
  }, [firestore]);

  const { data: apps, isLoading } = useCollection<App>(appsQuery);

  const handleEditClick = (app: App) => {
    setEditingApp(app);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (app: App) => {
    if (!firestore || !storage) return;
    if (window.confirm(`Are you sure you want to delete the app "${app.title}"? This will also delete all associated images.`)) {
      try {
        // Delete Firestore document
        await deleteDoc(doc(firestore, 'apps', app.id));

        // Delete all associated images from storage
        const imagesToDelete = [
          app.coverImage?.url,
          ...(app.galleryImages || []).map(img => img.url)
        ].filter(Boolean); // Filter out any undefined URLs

        const deletePromises = imagesToDelete.map(imageUrl => {
          try {
            const imageRef = ref(storage, imageUrl);
            return deleteObject(imageRef);
          } catch (error) {
            console.warn(`Could not delete image ${imageUrl}:`, error);
            return Promise.resolve(); // Don't fail the whole operation
          }
        });

        await Promise.all(deletePromises);

        toast({ title: 'App deleted successfully.' });
      } catch (error: any) {
        console.error('Error deleting app:', error);
        toast({ variant: 'destructive', title: 'Error deleting app', description: error.message });
      }
    }
  };

  if (isLoading) {
    return <p>Loading apps...</p>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-headline text-2xl font-bold mb-4">
          {editingApp ? 'Edit App/Website' : 'Add New App/Website'}
        </h2>
        <AppForm
          app={editingApp}
          onFinished={() => setEditingApp(null)}
        />
      </div>

      <h2 className="font-headline text-2xl font-bold">Existing Entries</h2>
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Platform(s)</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {apps?.map((app) => (
              <TableRow key={app.id}>
                <TableCell>{app.title}</TableCell>
                <TableCell>{app.platforms.join(', ')}</TableCell>
                <TableCell>{app.availability}</TableCell>
                <TableCell className="text-right space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEditClick(app)}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDelete(app)}
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
