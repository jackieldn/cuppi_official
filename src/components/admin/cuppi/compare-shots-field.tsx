'use client';

import { useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, ImagePlus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { COMPARE_LIMITS, type Shot } from '@/lib/compare-data';
import { describeError } from './errors';

/** What an upload hands back: where the picture now lives and its real size. */
export type UploadedShot = { src: string; width: number; height: number };
export type UploadShot = (file: File) => Promise<UploadedShot>;

/** The longest side of a screenshot's width we keep. Phone screenshots are about this wide; bigger only costs download time. */
const MAX_WIDTH = 1290;

/** An SVG's intrinsic size, read by loading it as a picture. Where it declares none (only a viewBox), a 512 square. */
function svgSize(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new window.Image();
    const done = (size: { width: number; height: number }) => {
      URL.revokeObjectURL(url);
      resolve(size);
    };
    img.onload = () => done(img.naturalWidth > 0 && img.naturalHeight > 0 ? { width: img.naturalWidth, height: img.naturalHeight } : { width: 512, height: 512 });
    img.onerror = () => done({ width: 512, height: 512 });
    img.src = url;
  });
}

/**
 * A chosen picture, made ready for the site: shrunk to a sensible width and saved as WebP (much smaller than the PNG a phone
 * produces). If the browser can't make a WebP the original goes up as it is.
 */
export async function prepareShot(file: File): Promise<{ blob: Blob; width: number; height: number; name: string }> {
  if (!file.type.startsWith('image/') && !/\.svg$/i.test(file.name)) throw new Error('Choose a picture (PNG, JPEG, WebP or SVG).');
  // An SVG is already small and sharp at any size: it goes up as it is (a canvas would only turn it into pixels). Its size is
  // read from the picture itself, falling back to a square when it gives none.
  if (file.type === 'image/svg+xml' || /\.svg$/i.test(file.name)) {
    const size = await svgSize(file);
    return { blob: file.type === 'image/svg+xml' ? file : new Blob([file], { type: 'image/svg+xml' }), width: size.width, height: size.height, name: file.name };
  }
  const bitmap = await createImageBitmap(file);
  // Read the picture's own size now: a bitmap that has been closed reports 0 by 0, and a 0 by 0 screenshot is not a screenshot.
  const own = { width: bitmap.width, height: bitmap.height };
  const scale = Math.min(1, MAX_WIDTH / own.width);
  const width = Math.round(own.width * scale);
  const height = Math.round(own.height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  canvas.getContext('2d')?.drawImage(bitmap, 0, 0, width, height);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/webp', 0.9));
  bitmap.close();
  if (!blob || blob.type !== 'image/webp') return { blob: file, width: own.width, height: own.height, name: file.name };
  return { blob, width, height, name: file.name.replace(/\.[^.]+$/, '') + '.webp' };
}

/**
 * Up to three screenshots for one app. Each uploads as soon as it is chosen, then has its own description (for people who
 * can't see it), and can be moved or removed. `defaultAlt` is the description a new picture starts with.
 */
export function ShotsField({
  label,
  shots,
  onChange,
  onAdd,
  upload,
  defaultAlt,
  max = COMPARE_LIMITS.shots,
}: {
  label: string;
  shots: Shot[];
  /** Edits made on the spot: a description typed, a screenshot moved or removed. */
  onChange: (shots: Shot[]) => void;
  /**
   * A screenshot that has finished uploading. It is handed up alone, to be added to whatever the draft is by then (not to the list as
   * it was when the upload began), so uploads that overlap, or edits made while one is under way, can't wipe each other out.
   */
  onAdd: (shot: Shot) => void;
  upload: UploadShot;
  defaultAlt: string;
  max?: number;
}) {
  const { toast } = useToast();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const add = async (file: File) => {
    setBusy(true);
    try {
      const up = await upload(file);
      onAdd({ ...up, alt: defaultAlt });
      toast({ title: 'Screenshot added', description: 'It is in your draft. Press Save comparison to publish it.' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Could not upload the screenshot', description: describeError(error) });
    } finally {
      setBusy(false);
    }
  };
  const move = (i: number, by: -1 | 1) => {
    const next = [...shots];
    [next[i], next[i + by]] = [next[i + by], next[i]];
    onChange(next);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{label}</span>
        <span className="text-xs text-muted-foreground">
          {shots.length} of {max}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {shots.map((s, i) => (
          <div key={s.src} className="space-y-1.5">
            <div className="relative overflow-hidden rounded-xl border bg-muted">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={s.src} alt={s.alt} className="block h-auto w-full" />
              <div className="absolute inset-x-0 top-0 flex justify-between p-1">
                <span className="flex gap-1">
                  <Button type="button" variant="secondary" size="icon" className="h-6 w-6" aria-label={`Move ${label} screenshot ${i + 1} earlier`} disabled={i === 0} onClick={() => move(i, -1)}>
                    <ArrowLeft className="h-3 w-3" />
                  </Button>
                  <Button type="button" variant="secondary" size="icon" className="h-6 w-6" aria-label={`Move ${label} screenshot ${i + 1} later`} disabled={i === shots.length - 1} onClick={() => move(i, 1)}>
                    <ArrowRight className="h-3 w-3" />
                  </Button>
                </span>
                <Button type="button" variant="destructive" size="icon" className="h-6 w-6" aria-label={`Remove ${label} screenshot ${i + 1}`} onClick={() => onChange(shots.filter((_, j) => j !== i))}>
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>
            <Input
              aria-label={`Description of ${label} screenshot ${i + 1}`}
              value={s.alt}
              maxLength={COMPARE_LIMITS.line}
              placeholder="What it shows"
              className="h-8 text-xs"
              onChange={(e) => onChange(shots.map((x, j) => (j === i ? { ...x, alt: e.target.value } : x)))}
            />
          </div>
        ))}
        {shots.length < max && (
          <button
            type="button"
            disabled={busy}
            onClick={() => input.current?.click()}
            className="flex aspect-[9/19] flex-col items-center justify-center gap-1 rounded-xl border border-dashed text-xs text-muted-foreground transition-colors hover:bg-muted disabled:opacity-50"
          >
            <ImagePlus className="h-5 w-5" aria-hidden />
            {busy ? 'Uploading…' : 'Add'}
          </button>
        )}
      </div>
      <input
        ref={input}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="sr-only"
        aria-label={`Add a ${label} screenshot`}
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = '';
          if (file) void add(file);
        }}
      />
    </div>
  );
}
