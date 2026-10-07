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

type ChatbotKnowledge = {
  id: string;
  title: string;
  content: string;
};

const knowledgeSchema = z.object({
  title: z.string().min(1, 'Title is required.'),
  content: z.string().min(1, 'Content is required.'),
});

type KnowledgeFormValues = z.infer<typeof knowledgeSchema>;

const defaultFormValues: KnowledgeFormValues = {
  title: '',
  content: '',
};

export function KnowledgeAdmin() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingKnowledge, setEditingKnowledge] = useState<ChatbotKnowledge | null>(null);

  const knowledgeQuery = useMemo(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'chatbot_knowledge'), orderBy('title'));
  }, [firestore]);

  const { data: knowledgeEntries, isLoading } = useCollection<ChatbotKnowledge>(knowledgeQuery);

  const form = useForm<KnowledgeFormValues>({
    resolver: zodResolver(knowledgeSchema),
    defaultValues: defaultFormValues,
  });

  const handleOpenDialog = (knowledge: ChatbotKnowledge | null) => {
    setEditingKnowledge(knowledge);
    if (knowledge) {
      form.reset({
        title: knowledge.title || '',
        content: knowledge.content || '',
      });
    } else {
      form.reset(defaultFormValues);
    }
    setIsDialogOpen(true);
  };

  const handleDelete = async (knowledge: ChatbotKnowledge) => {
    if (!firestore) return;
    if (!window.confirm(`Are you sure you want to delete the knowledge entry "${knowledge.title}"?`)) return;

    try {
      deleteDocumentNonBlocking(doc(firestore, 'chatbot_knowledge', knowledge.id));
      toast({ title: 'Knowledge entry deleted successfully.' });
    } catch (error: any) {
      console.error('Error deleting knowledge entry:', error);
      toast({ variant: 'destructive', title: 'Error deleting entry', description: error.message });
    }
  };

  const onSubmit = async (data: KnowledgeFormValues) => {
    if (!firestore) return;

    try {
      if (editingKnowledge) {
        updateDocumentNonBlocking(doc(firestore, 'chatbot_knowledge', editingKnowledge.id), data);
        toast({ title: 'Knowledge entry updated successfully!' });
      } else {
        addDocumentNonBlocking(collection(firestore, 'chatbot_knowledge'), data);
        toast({ title: 'Knowledge entry added successfully!' });
      }

      setIsDialogOpen(false);
    } catch (error: any) {
      console.error('Error saving knowledge entry:', error);
      toast({ variant: 'destructive', title: 'Error saving entry', description: error.message });
    }
  };

  return (
    <div className="border p-8 rounded-lg">
      <div className="flex justify-between items-center mb-4">
        <p className="text-muted-foreground">Manage the knowledge base for your AI chatbot.</p>
        <Button onClick={() => handleOpenDialog(null)}>Add Entry</Button>
      </div>
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Content</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && <TableRow><TableCell colSpan={3}>Loading...</TableCell></TableRow>}
            {knowledgeEntries?.map((entry) => (
              <TableRow key={entry.id}>
                <TableCell>{entry.title}</TableCell>
                <TableCell className="max-w-[300px] truncate">{entry.content}</TableCell>
                <TableCell className="text-right space-x-2">
                  <Button variant="outline" size="sm" onClick={() => handleOpenDialog(entry)}>Edit</Button>
                  <Button variant="destructive" size="sm" onClick={() => handleDelete(entry)}>Delete</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingKnowledge ? 'Edit Knowledge Entry' : 'Add New Knowledge Entry'}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField name="title" control={form.control} render={({ field }) => (
                <FormItem><FormLabel>Title</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField name="content" control={form.control} render={({ field }) => (
                <FormItem><FormLabel>Content</FormLabel><FormControl><Textarea {...field} rows={8} /></FormControl><FormMessage /></FormItem>
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
