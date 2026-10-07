'use client';

import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useFirestore, useStorage, useCollection, updateDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { collection, doc, addDoc, updateDoc, deleteDoc, query, orderBy } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { WorkExperience } from '@/lib/about-types';

const experienceSchema = z.object({
  companyName: z.string().min(1, 'Company name is required.'),
  position: z.string().min(1, 'Position is required.'),
  startDate: z.string().min(1, 'Start date is required.'),
  endDate: z.string().optional(),
  isCurrent: z.boolean().default(false),
  description: z.string().optional(),
  logo: z.any().optional(),
  order: z.coerce.number().optional(),
});

type ExperienceFormValues = z.infer<typeof experienceSchema>;

const defaultFormValues: ExperienceFormValues = {
  companyName: '',
  position: '',
  startDate: '',
  endDate: '',
  isCurrent: false,
  description: '',
  order: 0,
  logo: undefined,
};

export function ExperienceAdmin() {
  const firestore = useFirestore();
  const storage = useStorage();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingExperience, setEditingExperience] = useState<WorkExperience | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  const experienceQuery = useMemo(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'work_experience'), orderBy('startDate', 'desc'));
  }, [firestore]);

  const { data: experiences, isLoading } = useCollection<WorkExperience>(experienceQuery);

  const sortedExperiences = useMemo(() => {
    if (!experiences) return [];
    return [...experiences].sort((a, b) => {
      const orderA = a.order ?? Infinity;
      const orderB = b.order ?? Infinity;
      if (orderA !== Infinity || orderB !== Infinity) {
        return orderA - orderB;
      }
      return 0; // Keep original sort order if no 'order' field
    });
  }, [experiences]);

  const form = useForm<ExperienceFormValues>({
    resolver: zodResolver(experienceSchema),
    defaultValues: defaultFormValues,
  });
  
  const isCurrent = form.watch('isCurrent');

  const handleOpenDialog = (experience: WorkExperience | null) => {
    setEditingExperience(experience);
    if (experience) {
      form.reset({
        companyName: experience.companyName || '',
        position: experience.position || '',
        startDate: experience.startDate || '',
        endDate: experience.endDate || '',
        isCurrent: experience.isCurrent || false,
        description: experience.description || '',
        order: experience.order || 0,
      });
    } else {
      form.reset(defaultFormValues);
    }
    setIsDialogOpen(true);
  };

  const handleDelete = async (experience: WorkExperience) => {
    if (!firestore || !storage) return;
    if (!window.confirm(`Are you sure you want to delete the experience at "${experience.companyName}"?`)) return;

    try {
      deleteDocumentNonBlocking(doc(firestore, 'work_experience', experience.id));
      if (experience.logoUrl) {
        await deleteObject(ref(storage, experience.logoUrl));
      }
      toast({ title: 'Experience deleted successfully.' });
    } catch (error: any) {
      console.error('Error deleting experience:', error);
      toast({ variant: 'destructive', title: 'Error deleting experience', description: error.message });
    }
  };

  const onSubmit = async (data: ExperienceFormValues) => {
    if (!firestore || !storage) return;

    try {
      let logoUrl = editingExperience?.logoUrl || '';
      
      if (data.logo?.[0]) {
        setUploadProgress(0);
        const file = data.logo[0];
        const storageRef = ref(storage, `experience/${Date.now()}_${file.name}`);
        const uploadTask = uploadBytesResumable(storageRef, file);
        
        logoUrl = await new Promise<string>((resolve, reject) => {
          uploadTask.on('state_changed',
            (snapshot) => setUploadProgress((snapshot.bytesTransferred / snapshot.totalBytes) * 100),
            (error) => reject(error),
            async () => {
              const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
              if (editingExperience?.logoUrl) {
                  try {
                    await deleteObject(ref(storage, editingExperience.logoUrl));
                  } catch(e) { console.error("Could not delete old logo", e) }
              }
              resolve(downloadURL);
            }
          );
        });
      }

      const experienceData = {
        ...data,
        order: data.order || 0,
        logoUrl,
        endDate: data.isCurrent ? '' : data.endDate,
      };
      delete (experienceData as any).logo;

      if (editingExperience) {
        updateDocumentNonBlocking(doc(firestore, 'work_experience', editingExperience.id), experienceData);
        toast({ title: 'Experience updated successfully!' });
      } else {
        await addDoc(collection(firestore, 'work_experience'), experienceData);
        toast({ title: 'Experience added successfully!' });
      }

      setIsDialogOpen(false);
    } catch (error: any) {
      console.error('Error saving experience:', error);
      toast({ variant: 'destructive', title: 'Error saving experience', description: error.message });
    } finally {
      setUploadProgress(null);
    }
  };

  return (
    <div className="border p-8 rounded-lg">
      <div className="flex justify-between items-center mb-4">
        <p className="text-muted-foreground">Manage your work experience timeline.</p>
        <Button onClick={() => handleOpenDialog(null)}>Add Experience</Button>
      </div>
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Position</TableHead>
              <TableHead>Dates</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && <TableRow><TableCell colSpan={5}>Loading...</TableCell></TableRow>}
            {sortedExperiences.map((exp) => (
              <TableRow key={exp.id}>
                <TableCell>{exp.order}</TableCell>
                <TableCell>{exp.companyName}</TableCell>
                <TableCell>{exp.position}</TableCell>
                <TableCell>{exp.startDate} - {exp.isCurrent ? 'Present' : exp.endDate}</TableCell>
                <TableCell className="text-right space-x-2">
                  <Button variant="outline" size="sm" onClick={() => handleOpenDialog(exp)}>Edit</Button>
                  <Button variant="destructive" size="sm" onClick={() => handleDelete(exp)}>Delete</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{editingExperience ? 'Edit Experience' : 'Add New Experience'}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField name="companyName" control={form.control} render={({ field }) => (
                <FormItem><FormLabel>Company Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField name="position" control={form.control} render={({ field }) => (
                <FormItem><FormLabel>Position</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
               <FormField
                control={form.control}
                name="order"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sort Order</FormLabel>
                    <FormControl><Input type="number" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField name="startDate" control={form.control} render={({ field }) => (
                  <FormItem><FormLabel>Start Date (e.g., Apr 2022)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField name="endDate" control={form.control} render={({ field }) => (
                  <FormItem><FormLabel>End Date (or leave blank)</FormLabel><FormControl><Input {...field} disabled={isCurrent} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
              <FormField name="isCurrent" control={form.control} render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                      <div className="space-y-1 leading-none">
                          <FormLabel>I currently work here</FormLabel>
                      </div>
                  </FormItem>
              )} />
              <FormField name="description" control={form.control} render={({ field }) => (
                <FormItem><FormLabel>Description</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField name="logo" control={form.control} render={({ field }) => (
                <FormItem><FormLabel>Company Logo (1:1 aspect ratio)</FormLabel><FormControl><Input type="file" accept="image/*" onChange={(e) => field.onChange(e.target.files)} /></FormControl><FormMessage /></FormItem>
              )} />
              
              {uploadProgress !== null && <Progress value={uploadProgress} />}
              
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
