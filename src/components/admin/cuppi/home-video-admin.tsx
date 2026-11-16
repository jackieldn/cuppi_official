'use client';

import { useEffect, useMemo, useState } from 'react';
import { collection, doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { deleteObject, getDownloadURL, ref as storageRef, uploadBytesResumable } from 'firebase/storage';
import { Trash2, Video } from 'lucide-react';
import { useCollection, useDoc, useFirestore, useStorage } from '@/firebase';
import { VideoPlayer } from '@/components/cuppi/blocks/video-player';
import { Segmented } from '@/components/admin/apps/segmented';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { featuresSeed } from '@/lib/features-seed';
import { hasPage, isPublished, mergeFeatures, readOverride, type FeatureOverride, type VideoAspect } from '@/lib/features-types';
import { HOME_VIDEO_LIMITS as L, buttonText, resolveHomeVideo, validateHomeVideo, type HomeVideo } from '@/lib/home-video';
import { describeError } from './errors';

// The storage rules for cuppi_features/ allow videos (MP4, WebM or MOV) up to 200 MB, so the video goes there.
const MAX_BYTES = 200 * 1024 * 1024 - 1;
const ACCEPT = 'video/mp4,video/webm,video/quicktime';
const NO_FEATURE = 'none';
const STORAGE_PREFIX = 'https://firebasestorage.googleapis.com/';

type FeatureChoice = { slug: string; name: string };
type SaveProgress = (percent: number) => void;

/**
 * Sets the advertisement video under "What's new" on the Cuppi home page: the video file, an optional title and
 * description, and an optional button to a feature's page. Saved as one document (cuppi_home/video) and read back
 * through resolveHomeVideo, the same function the website uses. A chosen video uploads when Save is pressed.
 */
export function HomeVideoAdmin() {
  const firestore = useFirestore();
  const storage = useStorage();
  const ref = useMemo(() => (firestore ? doc(firestore, 'cuppi_home', 'video') : null), [firestore]);
  const featuresCol = useMemo(() => (firestore ? collection(firestore, 'cuppi_features') : null), [firestore]);
  const { data, isLoading } = useDoc<Record<string, unknown>>(ref);
  const { data: overridesData, isLoading: featuresLoading } = useCollection<Record<string, unknown>>(featuresCol);

  // The same list the website uses: the built-in features with the admin's edits on top, keeping those with a page.
  const features = useMemo<FeatureChoice[]>(() => {
    const overrides = (overridesData ?? []).map((d) => readOverride(d.id, d)).filter((o): o is FeatureOverride => o !== null);
    return mergeFeatures(featuresSeed, overrides)
      .filter((f) => isPublished(f) && hasPage(f))
      .map((f) => ({ slug: f.slug, name: f.name }));
  }, [overridesData]);

  if (isLoading || featuresLoading) return <Skeleton className="h-96 w-full" />;
  return (
    <HomeVideoEditor
      initial={resolveHomeVideo(data ?? null)}
      features={features}
      onSave={async (next, file, onProgress) => {
        if (!ref) throw new Error('The database is not ready yet.');
        const before = resolveHomeVideo(data ?? null).url;
        let url = next.url;
        if (file) {
          if (!storage) throw new Error('Storage is not ready yet.');
          const target = storageRef(storage, `cuppi_features/home-ad-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`);
          const task = uploadBytesResumable(target, file, { contentType: file.type });
          await new Promise<void>((resolve, reject) =>
            task.on('state_changed', (s) => onProgress(Math.round((s.bytesTransferred / s.totalBytes) * 100)), reject, () => resolve()),
          );
          url = await getDownloadURL(target);
        }
        const saved = { ...next, url };
        await setDoc(ref, { ...saved, updatedAt: serverTimestamp() });
        // The old file is no longer used by anything: tidy it away. Failing to is harmless (it just stays in storage).
        if (before && before !== url && before.startsWith(STORAGE_PREFIX) && storage) {
          try {
            await deleteObject(storageRef(storage, before));
          } catch {
            /* already gone, or not ours to delete */
          }
        }
        return saved;
      }}
    />
  );
}

/** The form. It knows nothing about the database: it is given what is saved and a way to save (which also uploads). */
export function HomeVideoEditor({
  initial,
  features,
  onSave,
}: {
  initial: HomeVideo;
  features: FeatureChoice[];
  onSave: (next: HomeVideo, file: File | null, onProgress: SaveProgress) => Promise<HomeVideo>;
}) {
  const { toast } = useToast();
  const [draft, setDraft] = useState<HomeVideo>(initial);
  const [saved, setSaved] = useState<HomeVideo>(initial);
  /** A video chosen but not uploaded yet, and a temporary address to preview it from. */
  const [file, setFile] = useState<File | null>(null);
  const [localUrl, setLocalUrl] = useState('');
  const [problems, setProblems] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(
    () => () => {
      if (localUrl) URL.revokeObjectURL(localUrl);
    },
    [localUrl],
  );

  const patch = (p: Partial<HomeVideo>) => setDraft((d) => ({ ...d, ...p }));
  const dirty = !!file || JSON.stringify(draft) !== JSON.stringify(saved);
  const videoUrl = localUrl || draft.url;
  const feature = features.find((f) => f.slug === draft.featureSlug);
  // A button pointing at a feature that is no longer on the list (switched off, or its page removed) is kept visible so it can be fixed.
  const missingFeature = draft.featureSlug && !feature;

  const choose = (picked: File | undefined) => {
    if (!picked) return;
    if (!ACCEPT.split(',').includes(picked.type)) return toast({ variant: 'destructive', title: 'That is not a supported video', description: 'Choose an MP4, WebM or MOV file.' });
    if (picked.size > MAX_BYTES) return toast({ variant: 'destructive', title: 'That video is too big', description: 'Videos can be up to 200 MB. Try exporting it at a lower quality.' });
    const url = URL.createObjectURL(picked);
    // Read the shape off the file itself, so a phone-shaped ad is set up as one without being asked.
    const probe = document.createElement('video');
    probe.preload = 'metadata';
    probe.onloadedmetadata = () => patch({ aspect: probe.videoHeight > probe.videoWidth ? '9:16' : '16:9' });
    probe.src = url;
    setFile(picked);
    setLocalUrl(url);
  };

  const removeVideo = () => {
    setFile(null);
    setLocalUrl('');
    patch({ url: '' });
  };

  const save = async () => {
    const clean: HomeVideo = { ...draft, title: draft.title.trim(), description: draft.description.trim(), buttonLabel: draft.featureSlug ? draft.buttonLabel.trim() : '' };
    const found = validateHomeVideo(clean, !!videoUrl);
    setProblems(found);
    if (found.length) return;
    setSaving(true);
    setProgress(0);
    try {
      const done = await onSave(clean, file, setProgress);
      setDraft(done);
      setSaved(done);
      setFile(null);
      setLocalUrl('');
      toast({ title: 'Home video saved', description: 'The home page picks it up within a minute.' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Could not save', description: describeError(error) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="space-y-2 pt-6 text-sm text-muted-foreground">
          <p>
            The video sits on the home page just under <strong className="text-foreground">What&rsquo;s new</strong>: use it for the latest advert. Add a title, a description and a button to a feature&rsquo;s page if they help, or leave them out and the video stands alone. Switch
            the section off to hide it without losing anything.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-6 pt-6">
          <div className="flex items-center justify-between gap-3 rounded-lg border p-4">
            <div>
              <Label htmlFor="hv-enabled" className="text-base">
                Show on the home page
              </Label>
              <p className="text-sm text-muted-foreground">{draft.enabled ? 'Visitors see it once it is saved and has a video.' : 'Hidden. Your video and words are kept.'}</p>
            </div>
            <Switch id="hv-enabled" checked={draft.enabled} onCheckedChange={(enabled) => patch({ enabled })} />
          </div>

          <div className="space-y-3">
            <Label>Video</Label>
            <div className="flex flex-wrap items-center gap-3">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm focus-within:ring-2 focus-within:ring-ring hover:bg-muted">
                <Video className="h-4 w-4" /> {videoUrl ? 'Replace the video' : 'Choose a video file'}
                <input
                  type="file"
                  accept={ACCEPT}
                  className="sr-only"
                  disabled={saving}
                  onChange={(e) => {
                    const picked = e.target.files?.[0];
                    e.target.value = '';
                    choose(picked);
                  }}
                />
              </label>
              {videoUrl && (
                <Button type="button" variant="ghost" size="sm" disabled={saving} onClick={removeVideo}>
                  <Trash2 className="mr-1 h-4 w-4" /> Remove
                </Button>
              )}
              {file && (
                <span className="truncate text-sm text-muted-foreground">
                  {file.name} ({(file.size / (1024 * 1024)).toFixed(1)} MB), uploads when you save
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">MP4, WebM or MOV, up to 200 MB. MP4 (H.264) plays everywhere.</p>

            {videoUrl && (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-sm text-muted-foreground">Shape:</span>
                  <Segmented<VideoAspect>
                    label="Video shape"
                    value={draft.aspect}
                    onChange={(aspect) => patch({ aspect })}
                    options={[
                      { value: '16:9', label: 'Widescreen' },
                      { value: '9:16', label: 'Phone-shaped' },
                    ]}
                  />
                  <span className="text-xs text-muted-foreground">Set from the file; change it only if it looks wrong.</span>
                </div>
                {/* The same player as the site, in the Cuppi theme. */}
                <div className="theme-cuppi rounded-lg bg-cuppi-paper p-3 font-body">
                  <div
                    className={draft.aspect === '9:16' ? 'relative mx-auto w-full max-w-[14rem] overflow-hidden rounded-[1.5rem] bg-cuppi-espresso' : 'relative mx-auto w-full max-w-xl overflow-hidden rounded-[1.5rem] bg-cuppi-espresso'}
                    style={{ aspectRatio: draft.aspect === '9:16' ? '9 / 16' : '16 / 9' }}
                  >
                    <VideoPlayer video={{ url: videoUrl, aspect: draft.aspect, label: draft.title || 'Preview' }} />
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="hv-title">Title (optional)</Label>
            <Input id="hv-title" value={draft.title} maxLength={L.title} placeholder="Meet Bin Day" onChange={(e) => patch({ title: e.target.value })} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="hv-description">Description (optional)</Label>
            <Textarea id="hv-description" rows={4} value={draft.description} maxLength={L.description} onChange={(e) => patch({ description: e.target.value })} />
            <p className="text-right text-xs tabular-nums text-muted-foreground">
              {draft.description.length} / {L.description}
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="hv-feature">Button goes to (optional)</Label>
              <Select value={draft.featureSlug || NO_FEATURE} onValueChange={(v) => patch(v === NO_FEATURE ? { featureSlug: '', buttonLabel: '' } : { featureSlug: v })}>
                <SelectTrigger id="hv-feature">
                  <SelectValue placeholder="No button" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_FEATURE}>No button</SelectItem>
                  {missingFeature && <SelectItem value={draft.featureSlug}>{draft.featureSlug} (no longer available)</SelectItem>}
                  {features.map((f) => (
                    <SelectItem key={f.slug} value={f.slug}>
                      {f.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {missingFeature ? 'That feature is switched off or has no page, so the site shows no button. Choose another.' : 'Opens that feature’s page. Only features that have a page are listed.'}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="hv-button">Button words (optional)</Label>
              <Input
                id="hv-button"
                value={draft.buttonLabel}
                maxLength={L.buttonLabel}
                disabled={!draft.featureSlug}
                placeholder={feature ? buttonText({ buttonLabel: '' }, feature.name) : 'Choose a feature first'}
                onChange={(e) => patch({ buttonLabel: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">Leave empty to use &ldquo;Explore&rdquo; and the feature&rsquo;s name.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {problems.length > 0 && (
        <ul role="alert" className="list-disc space-y-1 rounded-lg border border-destructive/50 bg-destructive/5 p-4 pl-8 text-sm text-destructive">
          {problems.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      )}

      {saving && file && (
        <div className="space-y-1">
          <Progress value={progress} />
          <p className="text-sm text-muted-foreground">{progress < 100 ? `Uploading the video… ${progress}%` : 'Finishing up…'}</p>
        </div>
      )}

      <div className="sticky bottom-0 flex flex-wrap items-center gap-3 border-t bg-background/95 py-3 backdrop-blur">
        <Button onClick={save} disabled={saving || !dirty}>
          {saving ? 'Saving…' : 'Save'}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={saving || !dirty}
          onClick={() => {
            setDraft(saved);
            setFile(null);
            setLocalUrl('');
            setProblems([]);
          }}
        >
          Discard changes
        </Button>
        {dirty && <span className="text-sm text-muted-foreground">Unsaved changes</span>}
      </div>
    </div>
  );
}
