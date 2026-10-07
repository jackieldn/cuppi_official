'use client';

import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useFirestore, useStorage, useCollection, setDocumentNonBlocking } from '@/firebase';
import { collection, doc, setDoc } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { Progress } from '@/components/ui/progress';

const profileSchema = z.object({
  name: z.string().min(1, 'Name is required.'),
  aboutText: z.string().min(1, 'About text is required.'),
  profilePicture: z.any().optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

type AboutProfile = {
  id: string;
  name: string;
  aboutText: string;
  profilePictureUrl: string;
};

// We assume there's only one profile document, with a fixed ID.
const PROFILE_DOC_ID = 'main_profile';

export function ProfileAdmin() {
  const firestore = useFirestore();
  const storage = useStorage();
  const { toast } = useToast();
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  const profileQuery = useMemo(() =>
    firestore ? collection(firestore, 'about_profile') : null,
    [firestore]
  );
  const { data: profiles, isLoading } = useCollection<AboutProfile>(profileQuery);
  const profileData = profiles?.[0];

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: '', aboutText: '' },
  });

  useEffect(() => {
    if (profileData) {
      form.reset({
        name: profileData.name,
        aboutText: profileData.aboutText,
      });
    }
  }, [profileData, form]);

  const onSubmit = async (data: ProfileFormValues) => {
    if (!firestore || !storage) return;

    try {
      let profilePictureUrl = profileData?.profilePictureUrl || '';
      
      if (data.profilePicture?.[0]) {
        setUploadProgress(0);
        const file = data.profilePicture[0];
        const storageRef = ref(storage, `about/${PROFILE_DOC_ID}/${file.name}`);
        const uploadTask = uploadBytesResumable(storageRef, file);

        await new Promise<void>((resolve, reject) => {
          uploadTask.on(
            'state_changed',
            (snapshot) => {
              const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
              setUploadProgress(progress);
            },
            (error) => {
              reject(error);
            },
            async () => {
              profilePictureUrl = await getDownloadURL(uploadTask.snapshot.ref);
              resolve();
            }
          );
        });
      }

      const docRef = doc(firestore, 'about_profile', PROFILE_DOC_ID);
      setDocumentNonBlocking(docRef, {
        name: data.name,
        aboutText: data.aboutText,
        profilePictureUrl: profilePictureUrl,
      }, { merge: true });

      toast({ title: 'Profile updated successfully!' });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error updating profile',
        description: error.message,
      });
    } finally {
        setUploadProgress(null);
    }
  };

  if (isLoading) return <p>Loading profile...</p>;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 border p-8 rounded-lg">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Full Name</FormLabel>
              <FormControl>
                <Input placeholder="Jack C Ward" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="aboutText"
          render={({ field }) => (
            <FormItem>
              <FormLabel>About Me Text</FormLabel>
              <FormControl>
                <Textarea placeholder="A Hungarian-born designer..." {...field} rows={5} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="profilePicture"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Profile Picture</FormLabel>
              <FormControl>
                <Input type="file" accept="image/*" onChange={(e) => field.onChange(e.target.files)} />
              </FormControl>
              {profileData?.profilePictureUrl && <p className="text-sm text-muted-foreground">Current image is set. Upload a new one to replace it.</p>}
              <FormMessage />
            </FormItem>
          )}
        />

        {uploadProgress !== null && <Progress value={uploadProgress} className="w-full" />}

        <Button type="submit" disabled={form.formState.isSubmitting}>
          Save Profile
        </Button>
      </form>
    </Form>
  );
}
