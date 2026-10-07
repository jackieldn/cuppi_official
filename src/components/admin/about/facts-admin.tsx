'use client';

import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useFirestore, useCollection, updateDocumentNonBlocking, deleteDocumentNonBlocking, addDocumentNonBlocking } from '@/firebase';
import { collection, doc, query, orderBy } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Fact } from '@/lib/about-types';

const factSchema = z.object({
  title: z.string().min(1, 'Title is required.'),
  description: z.string().min(1, 'Description is required.'),
  order: z.coerce.number().optional(),
});

type FactFormValues = z.infer<typeof factSchema>;

const defaultFormValues: FactFormValues = {
  title: '',
  description: '',
  order: 0,
};

export function FactsAdmin() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingFact, setEditingFact] = useState<Fact | null>(null);

  const factsQuery = useMemo(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'facts'), orderBy('order'));
  }, [firestore]);

  const { data: facts, isLoading } = useCollection<Fact>(factsQuery);

  const form = useForm<FactFormValues>({
    resolver: zodResolver(factSchema),
    defaultValues: defaultFormValues,
  });

  const handleOpenDialog = (fact: Fact | null) => {
    setEditingFact(fact);
    if (fact) {
      form.reset({
        title: fact.title || '',
        description: fact.description || '',
        order: fact.order || 0,
      });
    } else {
      form.reset(defaultFormValues);
    }
    setIsDialogOpen(true);
  };

  const handleDelete = async (fact: Fact) => {
    if (!firestore) return;
    if (!window.confirm(`Are you sure you want to delete the fact "${fact.title}"?`)) return;

    try {
      deleteDocumentNonBlocking(doc(firestore, 'facts', fact.id));
      toast({ title: 'Fact deleted successfully.' });
    } catch (error: any) {
      console.error('Error deleting fact:', error);
      toast({ variant: 'destructive', title: 'Error deleting fact', description: error.message });
    }
  };

  const onSubmit = async (data: FactFormValues) => {
    if (!firestore) return;

    try {
      const factData = {
        ...data,
        order: data.order || 0,
      };

      if (editingFact) {
        updateDocumentNonBlocking(doc(firestore, 'facts', editingFact.id), factData);
        toast({ title: 'Fact updated successfully!' });
      } else {
        addDocumentNonBlocking(collection(firestore, 'facts'), factData);
        toast({ title: 'Fact added successfully!' });
      }

      setIsDialogOpen(false);
    } catch (error: any) {
      console.error('Error saving fact:', error);
      toast({ variant: 'destructive', title: 'Error saving fact', description: error.message });
    }
  };

  return (
    <div className="border p-8 rounded-lg">
      <div className="flex justify-between items-center mb-4">
        <p className="text-muted-foreground">Manage the facts on your about page.</p>
        <Button onClick={() => handleOpenDialog(null)}>Add Fact</Button>
      </div>
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && <TableRow><TableCell colSpan={4}>Loading...</TableCell></TableRow>}
            {facts?.map((fact) => (
              <TableRow key={fact.id}>
                <TableCell>{fact.order}</TableCell>
                <TableCell>{fact.title}</TableCell>
                <TableCell className="max-w-[300px] truncate">{fact.description}</TableCell>
                <TableCell className="text-right space-x-2">
                  <Button variant="outline" size="sm" onClick={() => handleOpenDialog(fact)}>Edit</Button>
                  <Button variant="destructive" size="sm" onClick={() => handleDelete(fact)}>Delete</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingFact ? 'Edit Fact' : 'Add New Fact'}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField name="title" control={form.control} render={({ field }) => (
                <FormItem><FormLabel>Title</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField name="description" control={form.control} render={({ field }) => (
                <FormItem><FormLabel>Description</FormLabel><FormControl><Textarea {...field} rows={5}/></FormControl><FormMessage /></FormItem>
              )} />
              <FormField name="order" control={form.control} render={({ field }) => (
                <FormItem><FormLabel>Sort Order</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <DialogFooter>
                <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
                <Button type="submit" disabled={form.formState.isSubmitting}>Save</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
