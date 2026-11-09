'use client';

import { useMemo, useRef, useState } from 'react';
import { FileText, Trash2, Upload } from 'lucide-react';
import { useFirestore, useStorage, useCollection } from '@/firebase';
import { collection, deleteField, doc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { AboutProfile } from '@/lib/about-types';

// Must match the limit in storage.rules (the rules are what actually enforce it).
const MAX_CV_BYTES = 10 * 1024 * 1024;
// One CV at a time: a new upload overwrites the file at this path.
const CV_STORAGE_PATH = 'cv/cv.pdf';

/** Why this file can't be used as the CV, or null when it can. */
function validateCv(file: File): string | null {
  const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
  if (!isPdf) return 'The CV must be a PDF file.';
  if (file.size >= MAX_CV_BYTES) return 'The CV must be smaller than 10 MB.';
  return null;
}

/** A file name that is safe inside the Content-Disposition header the download uses. */
function downloadName(fileName: string): string {
  const safe = fileName.replace(/[^A-Za-z0-9._ -]/g, '-').trim();
  return safe || 'CV.pdf';
}

export function CvAdmin() {
  const firestore = useFirestore();
  const storage = useStorage();
  const { toast } = useToast();
  const fileInput = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);

  const profileQuery = useMemo(
    () => (firestore ? collection(firestore, 'about_profile') : null),
    [firestore]
  );
  const { data: profiles, isLoading } = useCollection<AboutProfile>(profileQuery);
  // The same document the About page reads, so the button shows up where it should.
  const profile = profiles?.[0];

  const isUploading = uploadProgress !== null;

  const clearSelection = () => {
    setFile(null);
    if (fileInput.current) fileInput.current.value = '';
  };

  const handleSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0] ?? null;
    if (selected) {
      const problem = validateCv(selected);
      if (problem) {
        toast({ variant: 'destructive', title: 'Can’t use that file', description: problem });
        clearSelection();
        return;
      }
    }
    setFile(selected);
  };

  const handleUpload = async () => {
    if (!file || !profile || !firestore || !storage) return;
    const problem = validateCv(file);
    if (problem) {
      toast({ variant: 'destructive', title: 'Can’t use that file', description: problem });
      return;
    }

    try {
      setUploadProgress(0);
      const task = uploadBytesResumable(ref(storage, CV_STORAGE_PATH), file, {
        contentType: 'application/pdf',
        // "attachment" makes the browser download the file under its own name.
        contentDisposition: `attachment; filename="${downloadName(file.name)}"`,
        cacheControl: 'no-cache',
      });
      const cvUrl = await new Promise<string>((resolve, reject) => {
        task.on(
          'state_changed',
          (snapshot) => setUploadProgress((snapshot.bytesTransferred / snapshot.totalBytes) * 100),
          reject,
          () => getDownloadURL(task.snapshot.ref).then(resolve, reject)
        );
      });

      await updateDoc(doc(firestore, 'about_profile', profile.id), {
        cvUrl,
        cvFileName: file.name,
      });

      toast({ title: 'CV uploaded', description: 'The Download CV button is now live on your About page.' });
      clearSelection();
    } catch (error: any) {
      console.error('Error uploading CV:', error);
      toast({ variant: 'destructive', title: 'Error uploading CV', description: error.message });
    } finally {
      setUploadProgress(null);
    }
  };

  const handleRemove = async () => {
    if (!profile?.cvUrl || !firestore || !storage) return;
    if (!window.confirm('Remove your CV? The Download CV button will disappear from your About page.')) return;

    setIsRemoving(true);
    try {
      // The button goes first, so visitors are never sent to a file that is already gone.
      await updateDoc(doc(firestore, 'about_profile', profile.id), {
        cvUrl: deleteField(),
        cvFileName: deleteField(),
      });
    } catch (error: any) {
      console.error('Error removing CV:', error);
      toast({ variant: 'destructive', title: 'Error removing CV', description: error.message });
      setIsRemoving(false);
      return;
    }

    try {
      await deleteObject(ref(storage, CV_STORAGE_PATH));
      toast({ title: 'CV removed' });
    } catch (error: any) {
      if (error?.code === 'storage/object-not-found') {
        toast({ title: 'CV removed' });
      } else {
        console.error('Error deleting CV file:', error);
        toast({
          variant: 'destructive',
          title: 'Button removed, but the file is still in storage',
          description: error.message,
        });
      }
    } finally {
      setIsRemoving(false);
    }
  };

  if (isLoading) return <p>Loading CV...</p>;

  return (
    <div className="space-y-6 border p-8 rounded-lg">
      <p className="text-muted-foreground">
        Upload your CV as a PDF (up to 10 MB). Once it is saved, a “Download CV” button appears in the
        Profile section of your About page. Uploading again replaces the current CV.
      </p>

      {!profile && (
        <p className="text-sm text-muted-foreground">
          Save your profile above first, then you can upload a CV.
        </p>
      )}

      {profile && (
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border p-4">
          {profile.cvUrl ? (
            <>
              <div className="flex min-w-0 items-center gap-3">
                <FileText className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
                <div className="min-w-0">
                  <p className="truncate font-medium">{profile.cvFileName || 'CV.pdf'}</p>
                  <a
                    href={profile.cvUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
                  >
                    Download current CV
                  </a>
                </div>
              </div>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={handleRemove}
                disabled={isRemoving || isUploading}
              >
                <Trash2 aria-hidden="true" />
                {isRemoving ? 'Removing...' : 'Remove CV'}
              </Button>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              No CV uploaded yet, so the Download CV button is hidden.
            </p>
          )}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="cv-file">{profile?.cvUrl ? 'Replace CV (PDF)' : 'CV (PDF)'}</Label>
        <Input
          id="cv-file"
          ref={fileInput}
          type="file"
          accept="application/pdf,.pdf"
          onChange={handleSelect}
          disabled={!profile || isUploading}
        />
      </div>

      {isUploading && <Progress value={uploadProgress ?? 0} className="w-full" />}

      <Button type="button" onClick={handleUpload} disabled={!file || !profile || isUploading}>
        <Upload aria-hidden="true" />
        {isUploading ? 'Uploading...' : profile?.cvUrl ? 'Replace CV' : 'Upload CV'}
      </Button>
    </div>
  );
}
