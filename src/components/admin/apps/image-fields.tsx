'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, ImagePlus, Replace, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { ShowcaseImage } from '@/lib/showcase';

/**
 * A picture in the form: either one already saved (url is its address) or one just
 * chosen (url is a local preview, and `file` is uploaded when the form is saved).
 */
export type DraftImage = ShowcaseImage & { key: string; file?: File };

const MAX_BYTES = 10 * 1024 * 1024;

export function toDraft(image: ShowcaseImage): DraftImage {
  return { ...image, key: image.url };
}

export function toSaved({ url, width, height }: DraftImage): ShowcaseImage {
  return { url, width, height };
}

let counter = 0;
const newKey = () => `new-${Date.now()}-${counter++}`;

/** Reads a chosen file's size so pages can lay screenshots out before they load. */
function readImageFile(file: File): Promise<DraftImage> {
  const url = URL.createObjectURL(file);
  return new Promise((resolve, reject) => {
    const probe = new window.Image();
    probe.onload = () => resolve({ key: newKey(), url, file, width: probe.naturalWidth, height: probe.naturalHeight });
    probe.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(`${file.name} could not be read as a picture.`));
    };
    probe.src = url;
  });
}

export type ReadImage = (files: File[]) => Promise<DraftImage[]>;

/**
 * Turns chosen files into drafts, skipping (with a message) anything that isn't a
 * picture or is over 10 MB. Local previews are released when the form closes.
 */
export function useImageReader(): ReadImage {
  const { toast } = useToast();
  const previews = useRef<string[]>([]);
  useEffect(() => {
    const urls = previews.current;
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, []);

  return useCallback(
    async (files) => {
      const drafts: DraftImage[] = [];
      for (const file of files) {
        if (!file.type.startsWith('image/')) {
          toast({ variant: 'destructive', title: 'Pictures only', description: `${file.name} is not an image.` });
          continue;
        }
        if (file.size >= MAX_BYTES) {
          toast({ variant: 'destructive', title: 'Too big', description: `${file.name} is over 10 MB.` });
          continue;
        }
        try {
          const draft = await readImageFile(file);
          previews.current.push(draft.url);
          drafts.push(draft);
        } catch (error) {
          toast({ variant: 'destructive', title: 'Could not add picture', description: (error as Error).message });
        }
      }
      return drafts;
    },
    [toast]
  );
}

/** A dashed target that takes a click or a dropped file. */
function DropZone({
  onFiles,
  multiple,
  children,
  className,
  disabled,
}: {
  onFiles: (files: File[]) => void;
  multiple?: boolean;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const pick = (list: FileList | null) => {
    const files = Array.from(list ?? []);
    if (input.current) input.current.value = '';
    if (files.length) onFiles(multiple ? files : files.slice(0, 1));
  };
  return (
    <>
      <button
        type="button"
        disabled={disabled}
        onClick={() => input.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          pick(e.dataTransfer.files);
        }}
        className={cn(
          'flex flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed text-sm text-muted-foreground transition-colors',
          'hover:border-foreground/40 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          over && 'border-primary bg-primary/5 text-foreground',
          disabled && 'opacity-50',
          className
        )}
      >
        {children}
      </button>
      <input
        ref={input}
        type="file"
        accept="image/*"
        multiple={multiple}
        className="hidden"
        tabIndex={-1}
        onChange={(e) => pick(e.target.files)}
      />
    </>
  );
}

interface ImagePickerProps {
  label: string;
  hint?: string;
  value: DraftImage | null;
  onChange: (next: DraftImage | null) => void;
  readImage: ReadImage;
  /** Shape of the empty target and the preview box. */
  shape?: 'square' | 'wide';
  error?: string;
  required?: boolean;
}

/** One picture: pick, replace or remove. */
export function ImagePicker({ label, hint, value, onChange, readImage, shape = 'wide', error, required }: ImagePickerProps) {
  const take = async (files: File[]) => {
    const [draft] = await readImage(files);
    if (draft) onChange(draft);
  };
  const box = shape === 'square' ? 'h-32 w-32' : 'h-40 w-full';

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium leading-none">
        {label}
        {required ? <span className="text-destructive"> *</span> : <span className="font-normal text-muted-foreground"> (optional)</span>}
      </p>
      {value ? (
        <div className="flex items-start gap-3">
          <div className={cn('flex shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-muted/40', box, shape === 'wide' && 'max-w-xs')}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={value.url} alt={`${label} preview`} className="max-h-full max-w-full object-contain" />
          </div>
          <div className="flex flex-col items-start gap-2">
            <DropZone onFiles={take} className="h-auto border-solid px-3 py-1.5 text-foreground">
              <span className="inline-flex items-center gap-2"><Replace className="h-4 w-4" /> Replace</span>
            </DropZone>
            <Button type="button" variant="ghost" size="sm" className="text-muted-foreground" onClick={() => onChange(null)}>
              <X className="mr-1 h-4 w-4" /> Remove
            </Button>
            {value.width > 0 && <p className="text-xs text-muted-foreground tabular-nums">{value.width} × {value.height}</p>}
          </div>
        </div>
      ) : (
        <DropZone onFiles={take} className={cn(box, shape === 'wide' && 'max-w-xs', error && 'border-destructive')}>
          <ImagePlus className="h-6 w-6" />
          <span>Choose or drop a picture</span>
        </DropZone>
      )}
      {hint && !error && <p className="text-xs text-muted-foreground">{hint}</p>}
      {error && <p className="text-sm font-medium text-destructive">{error}</p>}
    </div>
  );
}

interface MultiImagePickerProps {
  value: DraftImage[];
  onChange: (next: DraftImage[]) => void;
  readImage: ReadImage;
}

/** A row of pictures: add several at once, drag in more later, reorder, remove. */
export function MultiImagePicker({ value, onChange, readImage }: MultiImagePickerProps) {
  const add = async (files: File[]) => {
    const drafts = await readImage(files);
    if (drafts.length) onChange([...value, ...drafts]);
  };
  const move = (from: number, to: number) => {
    const next = [...value];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    onChange(next);
  };

  return (
    <div className="flex flex-wrap items-stretch gap-3">
      {value.map((image, i) => (
        <div key={image.key} className="w-32 space-y-1.5">
          <div className="flex h-44 items-center justify-center overflow-hidden rounded-lg border bg-muted/40">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={image.url} alt={`Screenshot ${i + 1}`} className="max-h-full max-w-full object-contain" />
          </div>
          <div className="flex items-center justify-between">
            <span className="flex">
              <Button type="button" variant="ghost" size="icon" className="h-7 w-7" disabled={i === 0} aria-label={`Move screenshot ${i + 1} earlier`} onClick={() => move(i, i - 1)}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <Button type="button" variant="ghost" size="icon" className="h-7 w-7" disabled={i === value.length - 1} aria-label={`Move screenshot ${i + 1} later`} onClick={() => move(i, i + 1)}>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </span>
            <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" aria-label={`Remove screenshot ${i + 1}`} onClick={() => onChange(value.filter((x) => x.key !== image.key))}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ))}
      <DropZone onFiles={add} multiple className="h-44 w-32">
        <ImagePlus className="h-6 w-6" />
        <span className="px-2 text-center text-xs">Add screenshots</span>
      </DropZone>
    </div>
  );
}
