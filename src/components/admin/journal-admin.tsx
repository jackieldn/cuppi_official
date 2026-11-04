'use client';

// Writes and edits the posts in Poot XP's Journal app (the Time Machine's
// 2006): notes on coding sessions and things worth sharing. They only show
// up there, and only once published.

import { useMemo, useState } from 'react';
import { addDoc, collection, deleteDoc, doc, query, serverTimestamp, updateDoc } from 'firebase/firestore';
import { Pencil, Plus, XCircle } from 'lucide-react';

import { useCollection, useFirestore, useStorage } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { RichTextEditor } from '@/components/admin/rich-text-editor';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { JOURNAL_POSTS, htmlHasContent, journalDate, journalHtml, sortJournal, type JournalPost } from '@/lib/poot-xp-types';

// Storage folder for the pictures put into posts.
const JOURNAL_IMAGES = 'journal_images';

type Draft = { title: string; date: string; body: string; published: boolean };

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const emptyDraft = (): Draft => ({ title: '', date: today(), body: '', published: false });

export function JournalAdmin() {
  const firestore = useFirestore();
  const storage = useStorage();
  const { toast } = useToast();

  // null: closed. A post's id, or 'new'.
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [saving, setSaving] = useState(false);

  const postsQuery = useMemo(() => (firestore ? query(collection(firestore, JOURNAL_POSTS)) : null), [firestore]);
  const { data, isLoading } = useCollection<JournalPost>(postsQuery);
  const posts = useMemo(() => (data ? sortJournal(data) : null), [data]);

  const openNew = () => {
    setDraft(emptyDraft());
    setEditingId('new');
  };

  const openEdit = (post: JournalPost) => {
    setDraft({ title: post.title ?? '', date: post.date || today(), body: journalHtml({ body: post.body ?? '', format: post.format }), published: !!post.published });
    setEditingId(post.id);
  };

  const handleSave = async () => {
    if (!firestore || !editingId) return;
    if (!draft.title.trim() || !htmlHasContent(draft.body)) {
      toast({ variant: 'destructive', title: 'A title and some text are required.' });
      return;
    }
    const fields = {
      title: draft.title.trim(),
      date: draft.date || today(),
      body: draft.body.trim(),
      format: 'html' as const,
      published: draft.published,
      updatedAt: serverTimestamp(),
    };
    setSaving(true);
    try {
      if (editingId === 'new') {
        await addDoc(collection(firestore, JOURNAL_POSTS), { ...fields, createdAt: serverTimestamp() });
      } else {
        await updateDoc(doc(firestore, JOURNAL_POSTS, editingId), fields);
      }
      toast({ title: draft.published ? 'Post published' : 'Draft saved' });
      setEditingId(null);
    } catch (error) {
      console.error('Journal save failed:', error);
      toast({ variant: 'destructive', title: 'Save failed', description: 'Could not save the post.' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (post: JournalPost) => {
    if (!firestore) return;
    if (!window.confirm(`Delete "${post.title}"? This can't be undone.`)) return;
    try {
      await deleteDoc(doc(firestore, JOURNAL_POSTS, post.id));
      toast({ title: 'Post deleted.' });
    } catch (error) {
      console.error('Journal delete failed:', error);
      toast({ variant: 'destructive', title: 'Deletion failed', description: 'Could not delete the post.' });
    }
  };

  const togglePublished = async (post: JournalPost) => {
    if (!firestore) return;
    try {
      await updateDoc(doc(firestore, JOURNAL_POSTS, post.id), { published: !post.published, updatedAt: serverTimestamp() });
    } catch (error) {
      console.error('Journal publish toggle failed:', error);
      toast({ variant: 'destructive', title: 'Update failed', description: 'Could not change the post.' });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="max-w-2xl text-sm text-muted-foreground">
          Posts show up in the Journal app on the desktop and in Poot XP on the Time Machine&apos;s 2006 desktop. Drafts
          stay hidden until you publish them. Use the toolbar to format text and add pictures.
        </p>
        <Button onClick={openNew}>
          <Plus className="mr-2 h-4 w-4" />
          New Post
        </Button>
      </div>

      {isLoading && (
        <div className="space-y-2">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      )}
      {!isLoading && posts?.length === 0 && <p className="text-sm text-muted-foreground">No posts yet. Write the first one!</p>}
      {!isLoading && !!posts?.length && (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {posts.map((post) => (
                <TableRow key={post.id}>
                  <TableCell className="font-medium">{post.title}</TableCell>
                  <TableCell className="whitespace-nowrap">{journalDate(post.date)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={!!post.published}
                        onCheckedChange={() => togglePublished(post)}
                        aria-label={post.published ? `Unpublish ${post.title}` : `Publish ${post.title}`}
                      />
                      <Badge variant={post.published ? 'default' : 'secondary'}>{post.published ? 'Published' : 'Draft'}</Badge>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="secondary" size="icon" className="h-8 w-8" onClick={() => openEdit(post)}>
                        <Pencil className="h-4 w-4" />
                        <span className="sr-only">Edit {post.title}</span>
                      </Button>
                      <Button variant="destructive" size="icon" className="h-8 w-8" onClick={() => handleDelete(post)}>
                        <XCircle className="h-5 w-5" />
                        <span className="sr-only">Delete {post.title}</span>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={!!editingId} onOpenChange={(open) => !open && !saving && setEditingId(null)}>
        <DialogContent className="max-h-[95vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId === 'new' ? 'New Post' : 'Edit Post'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid gap-4 sm:grid-cols-[1fr_180px]">
              <div className="space-y-2">
                <Label htmlFor="journal-title">Title</Label>
                <Input
                  id="journal-title"
                  value={draft.title}
                  onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                  placeholder="e.g. Building a time machine in React"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="journal-date">Date</Label>
                <Input id="journal-date" type="date" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="journal-body">Text</Label>
              <RichTextEditor
                // A fresh editor for each post opened.
                key={editingId}
                id="journal-body"
                initialHtml={draft.body}
                onChange={(body) => setDraft((d) => ({ ...d, body }))}
                storage={storage}
                imageFolder={JOURNAL_IMAGES}
                placeholder="What happened in today's session?"
              />
            </div>
            <div className="flex items-center gap-3">
              <Switch
                id="journal-published"
                checked={draft.published}
                onCheckedChange={(published) => setDraft({ ...draft, published })}
              />
              <Label htmlFor="journal-published">Published (visitors can read it)</Label>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" disabled={saving}>
                Cancel
              </Button>
            </DialogClose>
            <Button onClick={handleSave} disabled={saving}>
              {draft.published ? 'Save & Publish' : 'Save Draft'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
