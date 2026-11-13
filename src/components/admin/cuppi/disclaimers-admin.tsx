'use client';

import { useMemo, useState } from 'react';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { Copy, Plus, Trash2 } from 'lucide-react';
import { useDoc, useFirestore } from '@/firebase';
import { DisclaimerMark } from '@/components/cuppi/disclaimer';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { DISCLAIMER_LIMITS as L, disclaimerTag, resolveDisclaimers, validateDisclaimers, type Disclaimer } from '@/lib/disclaimers';
import { slugify } from '@/lib/features-types';
import { cn } from '@/lib/utils';
import { describeError } from './errors';

/**
 * Writes the disclaimers behind the (i) icons in the Cuppi site's text. Each has a tag name, the words for its bubble
 * and a note-to-self name. Saved as one document (cuppi_home/disclaimers) and read back through resolveDisclaimers,
 * the same function the website uses. A page uses one by putting its tag straight after a word: Medication{i:health}.
 */
export function DisclaimersAdmin() {
  const firestore = useFirestore();
  const ref = useMemo(() => (firestore ? doc(firestore, 'cuppi_home', 'disclaimers') : null), [firestore]);
  const { data, isLoading } = useDoc<Record<string, unknown>>(ref);
  if (isLoading) return <Skeleton className="h-96 w-full" />;
  return (
    <DisclaimersEditor
      initial={resolveDisclaimers(data ?? null)}
      onSave={async (items) => {
        if (!ref) throw new Error('The database is not ready yet.');
        await setDoc(ref, { items, updatedAt: serverTimestamp() });
      }}
    />
  );
}

/** The form. It knows nothing about the database: it is given what is saved and a way to save. */
export function DisclaimersEditor({ initial, onSave }: { initial: Disclaimer[]; onSave: (items: Disclaimer[]) => Promise<void> }) {
  const { toast } = useToast();
  const [items, setItems] = useState<Disclaimer[]>(initial);
  const [saved, setSaved] = useState<Disclaimer[]>(initial);
  /** Ids that are already saved: a page may use them, so they are not renamed here. */
  const [locked, setLocked] = useState(() => new Set(initial.map((d) => d.id)));
  const [problems, setProblems] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const dirty = JSON.stringify(items) !== JSON.stringify(saved);
  const update = (i: number, patch: Partial<Disclaimer>) => setItems((list) => list.map((d, n) => (n === i ? { ...d, ...patch } : d)));

  const save = async () => {
    const clean = items.map((d) => ({ id: d.id.trim(), label: d.label.trim() || d.id.trim(), text: d.text.trim() }));
    const found = validateDisclaimers(clean);
    setProblems(found);
    if (found.length) return;
    setSaving(true);
    try {
      await onSave(clean);
      setItems(clean);
      setSaved(clean);
      setLocked(new Set(clean.map((d) => d.id)));
      toast({ title: 'Disclaimers saved', description: 'The site picks them up within a minute.' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Could not save', description: describeError(error) });
    } finally {
      setSaving(false);
    }
  };

  const copy = async (id: string) => {
    try {
      await navigator.clipboard.writeText(disclaimerTag(id));
      toast({ title: 'Tag copied', description: `Paste ${disclaimerTag(id)} straight after the word.` });
    } catch {
      toast({ variant: 'destructive', title: 'Could not copy', description: `Type ${disclaimerTag(id)} instead.` });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="space-y-2 pt-6 text-sm text-muted-foreground">
          <p>
            A disclaimer puts a small <strong className="text-foreground">(i)</strong> icon beside a word. Hovering over it (or tapping it on a phone) opens a bubble with the words you write here. Write each once and use it wherever it is needed: change the words
            here and every place that uses it changes.
          </p>
          <p>
            To use one, type its tag <strong className="text-foreground">straight after the word, with no space</strong>, in any heading or paragraph on a feature page or the home hero: <code className="rounded bg-muted px-1 py-0.5 text-foreground">Medication{'{i:health}'}</code>. Tags
            cannot go in a label chip, a tab&rsquo;s title or a button.
          </p>
        </CardContent>
      </Card>

      {items.length === 0 && <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">No disclaimers yet.</p>}

      {items.map((d, i) => (
        <Card key={i}>
          <CardContent className="space-y-4 pt-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor={`d-label-${i}`}>Name (for you, not shown)</Label>
                <Input
                  id={`d-label-${i}`}
                  value={d.label}
                  maxLength={L.label}
                  placeholder="Health and medication"
                  onChange={(e) => {
                    const label = e.target.value;
                    // A new disclaimer takes its tag from its name until the tag is edited by hand.
                    update(i, !locked.has(d.id) && d.id === slugify(d.label).slice(0, L.id) ? { label, id: slugify(label).slice(0, L.id) } : { label });
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`d-id-${i}`}>Tag</Label>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">{'{i:'}</span>
                  <Input id={`d-id-${i}`} value={d.id} maxLength={L.id} disabled={locked.has(d.id)} className="font-mono" placeholder="health" onChange={(e) => update(i, { id: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })} />
                  <span className="text-muted-foreground">{'}'}</span>
                  <Button type="button" variant="outline" size="icon" aria-label={`Copy the tag ${disclaimerTag(d.id)}`} disabled={!d.id} onClick={() => copy(d.id)}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                {locked.has(d.id) && <p className="text-xs text-muted-foreground">A saved tag cannot be renamed, because pages may already use it. Add a new disclaimer instead.</p>}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor={`d-text-${i}`}>The words in the bubble</Label>
              <Textarea id={`d-text-${i}`} rows={4} value={d.text} maxLength={L.text} onChange={(e) => update(i, { text: e.target.value })} />
              <p className="text-right text-xs tabular-nums text-muted-foreground">
                {d.text.length} / {L.text}
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground">Try it:</span>
                {/* The same icon and bubble as the site, in the Cuppi theme. */}
                <span className="theme-cuppi rounded-lg bg-cuppi-paper px-3 py-2 font-body text-lg text-cuppi-ink">
                  Sample word
                  <DisclaimerMark text={d.text.trim() || 'The words you write above appear here.'} label={d.label} />
                </span>
              </div>
              <Button
                type="button"
                variant="ghost"
                className="text-destructive hover:text-destructive"
                onClick={() => {
                  const ask = locked.has(d.id) ? `Remove "${d.label || d.id}"? Any page that still uses ${disclaimerTag(d.id)} will show no icon, and the save cannot be undone.` : `Remove "${d.label || d.id || 'this disclaimer'}"?`;
                  if (window.confirm(ask)) setItems((list) => list.filter((_, n) => n !== i));
                }}
              >
                <Trash2 className="mr-2 h-4 w-4" /> Remove
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}

      <Button type="button" variant="outline" disabled={items.length >= L.items} onClick={() => setItems((list) => [...list, { id: '', label: '', text: '' }])}>
        <Plus className="mr-2 h-4 w-4" /> Add a disclaimer
      </Button>

      {problems.length > 0 && (
        <ul role="alert" className="list-disc space-y-1 rounded-lg border border-destructive/50 bg-destructive/5 p-4 pl-8 text-sm text-destructive">
          {problems.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      )}

      <div className={cn('sticky bottom-0 flex flex-wrap items-center gap-3 border-t bg-background/95 py-3 backdrop-blur')}>
        <Button onClick={save} disabled={saving || !dirty}>
          {saving ? 'Saving…' : 'Save disclaimers'}
        </Button>
        <Button type="button" variant="outline" disabled={saving || !dirty} onClick={() => { setItems(saved); setProblems([]); }}>
          Discard changes
        </Button>
        {dirty && <span className="text-sm text-muted-foreground">Unsaved changes</span>}
      </div>
    </div>
  );
}
