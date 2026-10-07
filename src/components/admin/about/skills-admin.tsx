'use client';

import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useFirestore, useStorage, useCollection, updateDocumentNonBlocking, deleteDocumentNonBlocking, addDocumentNonBlocking } from '@/firebase';
import { collection, doc, addDoc, updateDoc, deleteDoc, query, orderBy } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const skillSchema = z.object({
  name: z.string().min(1, 'Skill name is required.'),
  level: z.coerce.number().min(1).max(5),
  order: z.coerce.number().optional(),
  icon: z.any().optional(),
});

type SkillFormValues = z.infer<typeof skillSchema>;

export type TechnicalSkill = {
  id: string;
  name: string;
  level: number;
  order?: number;
  iconUrl: string;
};

const defaultFormValues: SkillFormValues = {
  name: '',
  level: 3,
  order: 0,
  icon: undefined,
};

const experienceLevels = [
  { value: 1, label: 'Beginner' },
  { value: 2, label: 'Intermediate' },
  { value: 3, label: 'Experienced' },
  { value: 4, label: 'Advanced' },
  { value: 5, label: 'Professional' },
];

export function SkillsAdmin() {
  const firestore = useFirestore();
  const storage = useStorage();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSkill, setEditingSkill] = useState<TechnicalSkill | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  const skillsQuery = useMemo(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'technical_skills'), orderBy('order'));
  }, [firestore]);

  const { data: skills, isLoading } = useCollection<TechnicalSkill>(skillsQuery);

  const form = useForm<SkillFormValues>({
    resolver: zodResolver(skillSchema),
    defaultValues: defaultFormValues,
  });

  const handleOpenDialog = (skill: TechnicalSkill | null) => {
    setEditingSkill(skill);
    if (skill) {
      form.reset({
        name: skill.name || '',
        level: skill.level || 3,
        order: skill.order || 0,
      });
    } else {
      form.reset(defaultFormValues);
    }
    setIsDialogOpen(true);
  };

  const handleDelete = async (skill: TechnicalSkill) => {
    if (!firestore || !storage) return;
    if (!window.confirm(`Are you sure you want to delete the skill "${skill.name}"?`)) return;

    try {
      deleteDocumentNonBlocking(doc(firestore, 'technical_skills', skill.id));
      if (skill.iconUrl) {
        const iconRef = ref(storage, skill.iconUrl);
        await deleteObject(iconRef);
      }
      toast({ title: 'Skill deleted successfully.' });
    } catch (error: any) {
      console.error('Error deleting skill:', error);
      toast({ variant: 'destructive', title: 'Error deleting skill', description: error.message });
    }
  };

  const onSubmit = async (data: SkillFormValues) => {
    if (!firestore || !storage) return;

    try {
      let iconUrl = editingSkill?.iconUrl || '';
      
      if (data.icon?.[0]) {
        setUploadProgress(0);
        const file = data.icon[0];
        const storageRef = ref(storage, `skills/${Date.now()}_${file.name}`);
        const uploadTask = uploadBytesResumable(storageRef, file);
        
        await new Promise<void>((resolve, reject) => {
          uploadTask.on(
            'state_changed',
            (snapshot) => setUploadProgress((snapshot.bytesTransferred / snapshot.totalBytes) * 100),
            (error) => reject(error),
            async () => {
              iconUrl = await getDownloadURL(uploadTask.snapshot.ref);
              if (editingSkill?.iconUrl) {
                  try {
                    await deleteObject(ref(storage, editingSkill.iconUrl));
                  } catch (e) {
                      console.warn("Could not delete old icon", e);
                  }
              }
              resolve();
            }
          );
        });
      }

      const skillData = {
        name: data.name,
        level: data.level,
        order: data.order || 0,
        iconUrl,
      };

      if (editingSkill) {
        updateDocumentNonBlocking(doc(firestore, 'technical_skills', editingSkill.id), skillData);
        toast({ title: 'Skill updated successfully!' });
      } else {
        addDocumentNonBlocking(collection(firestore, 'technical_skills'), skillData);
        toast({ title: 'Skill added successfully!' });
      }

      setIsDialogOpen(false);
    } catch (error: any) {
      console.error('Error saving skill:', error);
      toast({ variant: 'destructive', title: 'Error saving skill', description: error.message });
    } finally {
        setUploadProgress(null);
    }
  };

  return (
    <div className="border p-8 rounded-lg">
      <div className="flex justify-between items-center mb-4">
        <p className="text-muted-foreground">Manage your technical skills and experience levels.</p>
        <Button onClick={() => handleOpenDialog(null)}>Add Skill</Button>
      </div>
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order</TableHead>
              <TableHead>Skill Name</TableHead>
              <TableHead>Level</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && <TableRow><TableCell colSpan={4}>Loading...</TableCell></TableRow>}
            {skills?.map((skill) => (
              <TableRow key={skill.id}>
                <TableCell>{skill.order}</TableCell>
                <TableCell>{skill.name}</TableCell>
                <TableCell>{experienceLevels.find(l => l.value === skill.level)?.label}</TableCell>
                <TableCell className="text-right space-x-2">
                  <Button variant="outline" size="sm" onClick={() => handleOpenDialog(skill)}>Edit</Button>
                  <Button variant="destructive" size="sm" onClick={() => handleDelete(skill)}>Delete</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingSkill ? 'Edit Skill' : 'Add New Skill'}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Skill Name</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="level"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Experience Level</FormLabel>
                    <Select onValueChange={(val) => field.onChange(Number(val))} value={String(field.value)}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        {experienceLevels.map(level => (
                          <SelectItem key={level.value} value={String(level.value)}>{level.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
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
              <FormField
                control={form.control}
                name="icon"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Icon (1:1 aspect ratio)</FormLabel>
                    <FormControl>
                      <Input type="file" accept="image/*" onChange={(e) => field.onChange(e.target.files)} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {uploadProgress !== null && <Progress value={uploadProgress} />}
              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="outline">Cancel</Button>
                </DialogClose>
                <Button type="submit" disabled={form.formState.isSubmitting}>Save</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
