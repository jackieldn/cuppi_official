'use client';

import { useEffect, useMemo, useState } from 'react';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { getDownloadURL, ref as storageRef, uploadBytes } from 'firebase/storage';
import { useDoc, useFirestore, useStorage } from '@/firebase';
import { CompareView } from '@/components/cuppi/compare/compare-view';
import { SnapshotsView } from '@/components/cuppi/compare/snapshots-view';
import { Segmented } from '@/components/admin/apps/segmented';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { defaultCompare, proofGaps, type CompareContent } from '@/lib/compare-data';
import { resolveCompare, storedCompare, validateCompare, withoutSource } from '@/lib/compare-settings';
import { defaultPrices, resolvePlans, type PlansPrices } from '@/lib/plans-settings';
import { describeError } from './errors';
import { PageTab, PricesTab, PrivacyTab, SourcesTab } from './compare-basics-editor';
import { MatrixEditor } from './compare-matrix-editor';
import { prepareShot, type UploadShot } from './compare-shots-field';
import { ScreenshotsTab, SnapshotsTab } from './compare-snapshots-editor';

/**
 * The comparison page and its snapshots: the facts, their sources, the privacy cards, the prices, and the screenshots. Saved as one
 * document (cuppi_home/compare), read back through resolveCompare, the same function the website uses. A screenshot uploads as soon
 * as it is chosen (to cuppi_home/compare/ in storage), shrunk and saved as WebP.
 */
export function CompareAdmin() {
  const firestore = useFirestore();
  const storage = useStorage();
  const ref = useMemo(() => (firestore ? doc(firestore, 'cuppi_home', 'compare') : null), [firestore]);
  const plansRef = useMemo(() => (firestore ? doc(firestore, 'cuppi_home', 'plans') : null), [firestore]);
  const stored = useDoc<Record<string, unknown>>(ref);
  const plans = useDoc<Record<string, unknown>>(plansRef);

  if (stored.isLoading || plans.isLoading) return <Skeleton className="h-96 w-full" />;
  return (
    <CompareEditor
      stored={stored.data ?? null}
      prices={resolvePlans(plans.data ?? null, []).prices}
      onSave={async (content) => {
        if (!ref) throw new Error('The database is not ready yet.');
        await setDoc(ref, { ...storedCompare(content), updatedAt: serverTimestamp() });
      }}
      onUpload={async (file) => {
        if (!storage) throw new Error('Storage is not ready yet.');
        const prepared = await prepareShot(file);
        const safe = prepared.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const r = storageRef(storage, `cuppi_home/compare/${Date.now()}-${safe}`);
        await uploadBytes(r, prepared.blob, { contentType: prepared.blob.type });
        return { src: await getDownloadURL(r), width: prepared.width, height: prepared.height };
      }}
    />
  );
}

/** The form. It knows nothing about the database: it is given what is saved, the Plans prices, and ways to save and to upload. */
export function CompareEditor({
  stored,
  prices = defaultPrices(),
  onSave,
  onUpload,
}: {
  stored: unknown;
  prices?: PlansPrices;
  onSave: (content: CompareContent) => Promise<void>;
  onUpload: UploadShot;
}) {
  const { toast } = useToast();
  const [content, setContent] = useState<CompareContent>(() => resolveCompare(stored));
  const [saved, setSaved] = useState<CompareContent>(content);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState<'compare' | 'snapshots'>('compare');

  const dirty = JSON.stringify(content) !== JSON.stringify(saved);
  const gaps = proofGaps(content).length;

  // Leaving or refreshing with changes that were never saved would lose them (an upload only goes into the draft until Save), so ask first.
  useEffect(() => {
    if (!dirty) return;
    const ask = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', ask);
    return () => window.removeEventListener('beforeunload', ask);
  }, [dirty]);

  const save = async () => {
    const problems = validateCompare(content);
    if (problems.length > 0) {
      toast({ variant: 'destructive', title: 'The comparison is not ready to save', description: problems.slice(0, 6).join(' ') + (problems.length > 6 ? ` (and ${problems.length - 6} more)` : '') });
      return;
    }
    setSaving(true);
    try {
      await onSave(content);
      setSaved(content);
      toast({ title: 'Comparison saved', description: 'The site picks it up within a minute.' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Could not save the comparison', description: describeError(error) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:h-full lg:grid-cols-[minmax(0,1.15fr)_minmax(420px,1fr)]">
      <div className="min-w-0 lg:overflow-y-auto">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Preview</h2>
          <Segmented
            label="Preview page"
            value={preview}
            onChange={setPreview}
            options={[
              { value: 'compare', label: 'Comparison' },
              { value: 'snapshots', label: 'Snapshots' },
            ]}
          />
        </div>
        <div className="theme-cuppi font-body rounded-xl border bg-background pb-6 text-cuppi-ink">
          {preview === 'compare' ? <CompareView content={content} prices={prices} /> : <SnapshotsView content={content} />}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">The pages are at /compare and /compare/snapshots. Both stay hidden from search until the “noindex” line is removed from their page files.</p>
      </div>

      <div className="flex min-h-0 min-w-0 flex-col">
        <Tabs defaultValue="page" className="flex min-h-0 flex-1 flex-col">
          <TabsList className="h-auto flex-wrap justify-start">
            <TabsTrigger value="page">Page</TabsTrigger>
            <TabsTrigger value="matrix">Matrix</TabsTrigger>
            <TabsTrigger value="privacy">Privacy</TabsTrigger>
            <TabsTrigger value="prices">Prices</TabsTrigger>
            <TabsTrigger value="sources">Sources</TabsTrigger>
            <TabsTrigger value="screenshots">Screenshots</TabsTrigger>
            <TabsTrigger value="snapshots">Snapshots{gaps > 0 ? ` (${gaps} to do)` : ''}</TabsTrigger>
          </TabsList>
          <div className="mt-4 lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:pr-2">
            <TabsContent value="page" className="mt-0">
              <PageTab content={content} onChange={setContent} update={setContent} upload={onUpload} />
            </TabsContent>
            <TabsContent value="matrix" className="mt-0">
              <MatrixEditor groups={content.groups} sources={content.sources} onChange={(groups) => setContent({ ...content, groups })} />
            </TabsContent>
            <TabsContent value="privacy" className="mt-0">
              <PrivacyTab content={content} onChange={setContent} />
            </TabsContent>
            <TabsContent value="prices" className="mt-0">
              <PricesTab content={content} onChange={setContent} />
            </TabsContent>
            <TabsContent value="sources" className="mt-0">
              <SourcesTab content={content} onChange={(sources) => setContent({ ...content, sources })} onRemove={(id) => setContent(withoutSource(content, id))} />
            </TabsContent>
            <TabsContent value="screenshots" className="mt-0">
              <ScreenshotsTab content={content} onChange={setContent} update={setContent} upload={onUpload} />
            </TabsContent>
            <TabsContent value="snapshots" className="mt-0">
              <SnapshotsTab content={content} onChange={setContent} update={setContent} upload={onUpload} />
            </TabsContent>
          </div>
        </Tabs>

        {/* Outside the scrolling list, so Save is always in reach. */}
        <div className="sticky bottom-0 flex flex-wrap items-center gap-3 border-t bg-background/95 py-3 backdrop-blur lg:static lg:pt-3">
          <Button onClick={save} disabled={saving || !dirty}>
            {saving ? 'Saving…' : 'Save comparison'}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={saving}
            onClick={() => {
              if (window.confirm('Start again from the built-in facts? Your edits, sources and snapshots here are lost (screenshots already uploaded stay in storage).')) setContent(defaultCompare());
            }}
          >
            Start again from the built-in facts
          </Button>
          {dirty && <span className="text-sm font-medium text-amber-700 dark:text-amber-400">Unsaved changes: press Save to publish them</span>}
        </div>
      </div>
    </div>
  );
}
