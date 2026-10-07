'use client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useFirestore, useDoc, setDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { useEffect, useMemo } from 'react';
import { LegalDocument } from '@/lib/about-types';
import { Skeleton } from '@/components/ui/skeleton';

const legalDocSchema = z.object({
  title: z.string().min(1, 'Title is required.'),
  content: z.string().min(1, 'Content is required.'),
});

type LegalDocFormValues = z.infer<typeof legalDocSchema>;

interface LegalDocumentEditorProps {
  docId: string;
  docTitle: string;
}

function LegalDocumentEditor({ docId, docTitle }: LegalDocumentEditorProps) {
  const firestore = useFirestore();
  const { toast } = useToast();

  const docRef = useMemo(() => 
    firestore ? doc(firestore, 'legal_documents', docId) : null,
    [firestore, docId]
  );
  
  const { data: legalDoc, isLoading } = useDoc<LegalDocument>(docRef);

  const form = useForm<LegalDocFormValues>({
    resolver: zodResolver(legalDocSchema),
    defaultValues: { title: '', content: '' },
  });

  useEffect(() => {
    if (legalDoc) {
      form.reset({
        title: legalDoc.title,
        content: legalDoc.content,
      });
    } else if (!isLoading) {
        form.reset({
            title: docTitle,
            content: `Content for ${docTitle} goes here.`
        })
    }
  }, [legalDoc, isLoading, form, docTitle]);

  const onSubmit = async (data: LegalDocFormValues) => {
    if (!docRef) return;
    
    try {
        const docData = {
            ...data,
            slug: docId
        }
        setDocumentNonBlocking(docRef, docData, { merge: true });
        toast({ title: `${data.title} updated successfully!` });
    } catch (error: any) {
        toast({
            variant: 'destructive',
            title: `Error updating ${docTitle}`,
            description: error.message,
        });
    }
  };
  
  if (isLoading) {
      return <Skeleton className="h-96 w-full" />
  }

  return (
    <div className="border p-8 rounded-lg">
      <h2 className="font-headline text-2xl font-bold mb-4">{docTitle}</h2>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Document Title</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Content (Markdown supported)</FormLabel>
                  <FormControl><Textarea {...field} rows={20} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" disabled={form.formState.isSubmitting}>Save {docTitle}</Button>
        </form>
      </Form>
    </div>
  );
}


export function LegalDocsAdmin() {
  return (
    <div className="space-y-12">
        <LegalDocumentEditor docId="terms-and-conditions" docTitle="Terms & Conditions" />
        <LegalDocumentEditor docId="privacy-policy" docTitle="Privacy Policy" />
        <LegalDocumentEditor docId="beta-program-policy" docTitle="Beta Program Policy" />
    </div>
  );
}
