'use client';

import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
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
import { Testimonial } from '@/lib/about-types';

const testimonialSchema = z.object({
  name: z.string().min(1, 'Name is required.'),
  role: z.string().optional(),
  company: z.string().optional(),
  text: z.string().min(1, 'Testimonial text is required.'),
  order: z.coerce.number().optional(),
  date: z.string().optional(),
});

type TestimonialFormValues = z.infer<typeof testimonialSchema>;

const defaultFormValues: TestimonialFormValues = {
  name: '',
  role: '',
  company: '',
  text: '',
  order: 0,
  date: '',
};

export function TestimonialsAdmin() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTestimonial, setEditingTestimonial] = useState<Testimonial | null>(null);

  const testimonialsQuery = useMemo(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'testimonials'), orderBy('order'));
  }, [firestore]);

  const { data: testimonials, isLoading } = useCollection<Testimonial>(testimonialsQuery);

  const form = useForm<TestimonialFormValues>({
    resolver: zodResolver(testimonialSchema),
    defaultValues: defaultFormValues,
  });

  const handleOpenDialog = (testimonial: Testimonial | null) => {
    setEditingTestimonial(testimonial);
    if (testimonial) {
      form.reset({
        name: testimonial.name || '',
        role: testimonial.role || '',
        company: testimonial.company || '',
        text: testimonial.text || '',
        order: testimonial.order || 0,
        date: testimonial.date || '',
      });
    } else {
      form.reset(defaultFormValues);
    }
    setIsDialogOpen(true);
  };

  const handleDelete = async (testimonial: Testimonial) => {
    if (!firestore) return;
    if (!window.confirm(`Are you sure you want to delete the testimonial from "${testimonial.name}"?`)) return;

    try {
      deleteDocumentNonBlocking(doc(firestore, 'testimonials', testimonial.id));
      toast({ title: 'Testimonial deleted successfully.' });
    } catch (error: any) {
      console.error('Error deleting testimonial:', error);
      toast({ variant: 'destructive', title: 'Error deleting testimonial', description: error.message });
    }
  };

  const onSubmit = async (data: TestimonialFormValues) => {
    if (!firestore) return;

    try {
      const testimonialData = {
        ...data,
        order: data.order || 0,
        date: data.date || null,
      };

      if (editingTestimonial) {
        updateDocumentNonBlocking(doc(firestore, 'testimonials', editingTestimonial.id), testimonialData);
        toast({ title: 'Testimonial updated successfully!' });
      } else {
        addDocumentNonBlocking(collection(firestore, 'testimonials'), testimonialData);
        toast({ title: 'Testimonial added successfully!' });
      }

      setIsDialogOpen(false);
    } catch (error: any) {
      console.error('Error saving testimonial:', error);
      toast({ variant: 'destructive', title: 'Error saving testimonial', description: error.message });
    }
  };

  return (
    <div className="border p-8 rounded-lg">
      <div className="flex justify-between items-center mb-4">
        <p className="text-muted-foreground">Manage the testimonials on your about page.</p>
        <Button onClick={() => handleOpenDialog(null)}>Add Testimonial</Button>
      </div>
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Company</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && <TableRow><TableCell colSpan={5}>Loading...</TableCell></TableRow>}
            {testimonials?.map((testimonial) => (
              <TableRow key={testimonial.id}>
                <TableCell>{testimonial.order}</TableCell>
                <TableCell>{testimonial.name}</TableCell>
                <TableCell>
                  {testimonial.date ? format(new Date(testimonial.date), 'PPP') : 'N/A'}
                </TableCell>
                <TableCell>{testimonial.company}</TableCell>
                <TableCell className="text-right space-x-2">
                  <Button variant="outline" size="sm" onClick={() => handleOpenDialog(testimonial)}>Edit</Button>
                  <Button variant="destructive" size="sm" onClick={() => handleDelete(testimonial)}>Delete</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{editingTestimonial ? 'Edit Testimonial' : 'Add New Testimonial'}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField name="name" control={form.control} render={({ field }) => (
                <FormItem><FormLabel>Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <div className="grid grid-cols-2 gap-4">
                <FormField name="role" control={form.control} render={({ field }) => (
                  <FormItem><FormLabel>Role</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField name="company" control={form.control} render={({ field }) => (
                  <FormItem><FormLabel>Company</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
              <FormField name="text" control={form.control} render={({ field }) => (
                <FormItem><FormLabel>Testimonial Text</FormLabel><FormControl><Textarea {...field} rows={8} /></FormControl><FormMessage /></FormItem>
              )} />
              <div className="grid grid-cols-2 gap-4">
                <FormField name="order" control={form.control} render={({ field }) => (
                  <FormItem><FormLabel>Sort Order</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date Given (e.g., YYYY-MM-DD)</FormLabel>
                      <FormControl><Input placeholder="2023-10-26" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
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
