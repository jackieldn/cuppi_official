'use client';

import { createContext, useContext, useId, type ReactNode } from 'react';
import { ArrowDown, ArrowUp, ImagePlus, Plus, Trash2, Video, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TINTS } from '@/components/cuppi/blocks/tints';
import { Segmented } from '@/components/admin/apps/segmented';
import { SECTION_TINTS } from '@/lib/feature-sections';
import type { FeatureImage, FeatureTint } from '@/lib/features-types';
import { cn } from '@/lib/utils';

/**
 * How a form field hands a chosen file to the page builder. It checks the file, keeps it until Save
 * and returns a local address to show in the preview straight away (or null, having said why).
 * A context rather than a prop, so each template's form stays a plain list of fields.
 */
export type AddFile = (file: File, kind: 'image' | 'video') => string | null;
export const UploadsContext = createContext<AddFile>(() => null);
export const useAddFile = () => useContext(UploadsContext);

/** A chosen picture's real size, so a phone frame can be laid out before the picture loads. */
const probe = (url: string): Promise<{ width: number; height: number } | undefined> =>
  new Promise((resolve) => {
    const img = new window.Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => resolve(undefined);
    img.src = url;
  });

export type PictureSize = { width: number; height: number };

export const TINT_NAMES: Record<FeatureTint, string> = { honey: 'Honey', sky: 'Sky', moss: 'Moss', clay: 'Clay', lake: 'Lake' };

export function Field({ label, hint, htmlFor, optional, children }: { label: string; hint?: string; htmlFor?: string; optional?: boolean; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={htmlFor}>
        {label} {optional && <span className="font-normal text-muted-foreground">(optional)</span>}
      </Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

/** The five brand colours as swatches, as the home hero editor shows them. */
export function TintField({ value, onChange, label = 'Colour', hint }: { value: FeatureTint; onChange: (t: FeatureTint) => void; label?: string; hint?: string }) {
  return (
    <Field label={label} hint={hint}>
      <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2">
        {SECTION_TINTS.map((t) => {
          const active = value === t;
          return (
            <button
              key={t}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(t)}
              className={cn(
                'flex items-center gap-2 rounded-lg border py-1.5 pl-1.5 pr-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                active ? 'border-primary ring-1 ring-primary' : 'hover:bg-muted/50',
              )}
            >
              <span className="theme-cuppi inline-block">
                <span className={cn('block h-6 w-6 rounded-md border border-black/10', TINTS[t].surface)} />
              </span>
              {TINT_NAMES[t]}
            </button>
          );
        })}
      </div>
    </Field>
  );
}

/** Picks a picture file and shows it. Knows only the address; the page builder uploads on Save. */
export function PictureInput({ url, onChange, label, hint, empty = 'Choose a picture' }: { url: string; onChange: (url: string, size?: PictureSize) => void; label: string; hint?: string; empty?: string }) {
  const addFile = useAddFile();
  return (
    <Field label={label} hint={hint}>
      <div className="flex flex-wrap items-center gap-3">
        {url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="" className="h-20 w-auto max-w-[9rem] rounded-md border bg-muted object-contain" />
        )}
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-muted focus-within:ring-2 focus-within:ring-ring">
          <ImagePlus className="h-4 w-4" /> {url ? 'Replace' : empty}
          <input
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = '';
              const local = file ? addFile(file, 'image') : null;
              if (local) void probe(local).then((size) => onChange(local, size));
            }}
          />
        </label>
        {url && (
          <Button type="button" variant="ghost" size="sm" onClick={() => onChange('')}>
            <X className="mr-1 h-4 w-4" /> Remove
          </Button>
        )}
      </div>
    </Field>
  );
}

/** Which end of a screenshot a phone shows. */
function ViewField({ label, value, onChange }: { label: string; value?: 'top' | 'bottom'; onChange: (v: 'top' | 'bottom') => void }) {
  return (
    <Field label={label} hint="Show the bottom when the content you want to feature is at the bottom of the screen.">
      <Segmented
        label={label}
        value={value === 'bottom' ? 'bottom' : 'top'}
        onChange={onChange}
        options={[
          { value: 'top', label: 'Top of the screen' },
          { value: 'bottom', label: 'Bottom of the screen' },
        ]}
      />
    </Field>
  );
}

/** A picture with its description and, when the template allows, how it sits (in a phone, a phone crop, a photo, or shown whole). */
export function ImageEditor({
  image,
  onChange,
  label = 'Picture',
  fits,
  hint,
}: {
  image: FeatureImage;
  onChange: (image: FeatureImage) => void;
  label?: string;
  /** The ways this template can show a picture. One means no choice is offered. */
  fits: { value: NonNullable<FeatureImage['fit']>; label: string; hint: string }[];
  hint?: string;
}) {
  const altId = useId();
  const fit = image.fit ?? 'phone';
  const current = fits.find((f) => f.value === fit) ?? fits[0];
  const framed = current.value === 'frame';
  const tilt = image.frame === 'tilt';
  const pair = !!image.second;
  const withSize = (url: string, size?: PictureSize) => ({ url, width: size?.width, height: size?.height });

  return (
    <div className="space-y-3 rounded-lg border bg-background p-3">
      {fits.length > 1 && (
        <Field label="How it is shown" hint={current.hint}>
          <Segmented label="How the picture is shown" value={current.value} onChange={(v) => onChange({ ...image, fit: v, ...(v === 'frame' ? {} : { second: undefined, arrange: undefined, slide: undefined }) })} options={fits.map((f) => ({ value: f.value, label: f.label }))} />
        </Field>
      )}
      <PictureInput
        label={framed ? (pair ? 'First screenshot' : 'Screenshot') : label}
        url={image.url}
        onChange={(url, size) => onChange({ ...image, ...withSize(url, size) })}
        hint={framed ? 'A plain screenshot from the app, not already in a phone. The top of the screen shows.' : hint}
      />
      {image.url && (
        <Field label="Describe it" hint="For screen readers and search engines." htmlFor={altId} optional>
          <Input id={altId} value={image.alt} maxLength={200} onChange={(e) => onChange({ ...image, alt: e.target.value })} />
        </Field>
      )}

      {framed && image.url && <ViewField label={pair ? 'First phone shows' : 'The phone shows'} value={image.view} onChange={(view) => onChange({ ...image, view })} />}

      {framed && (
        <>
          <Field label="Phones">
            <Segmented
              label="One phone or two"
              value={pair ? 'two' : 'one'}
              onChange={(v) => onChange({ ...image, second: v === 'two' ? (image.second ?? { url: '', alt: '' }) : undefined, ...(v === 'two' ? { slide: undefined } : { arrange: undefined }) })}
              options={[
                { value: 'one', label: 'One phone' },
                { value: 'two', label: 'Two side by side' },
              ]}
            />
          </Field>
          {pair && (
            <Field label="Arrangement">
              <Segmented
                label="How the two phones sit"
                value={image.arrange ?? 'lower'}
                onChange={(arrange) => onChange({ ...image, arrange })}
                options={[
                  { value: 'lower', label: 'Right one lower' },
                  { value: 'higher', label: 'Right one higher' },
                  { value: 'level', label: 'Level, small gap' },
                ]}
              />
            </Field>
          )}
          {pair && (
            <div className="space-y-3 rounded-md border p-3">
              <PictureInput label="Second screenshot" url={image.second?.url ?? ''} onChange={(url, size) => onChange({ ...image, second: { alt: image.second?.alt ?? '', ...withSize(url, size) } })} hint="Shown in the second phone, a little lower." />
              {image.second?.url && (
                <Field label="Describe it" htmlFor={`${altId}-2`} optional>
                  <Input id={`${altId}-2`} value={image.second.alt} maxLength={200} onChange={(e) => onChange({ ...image, second: { ...image.second!, alt: e.target.value } })} />
                </Field>
              )}
              {image.second?.url && <ViewField label="Second phone shows" value={image.second.view} onChange={(view) => onChange({ ...image, second: { ...image.second!, view } })} />}
            </div>
          )}
          <div className="flex flex-wrap gap-x-6 gap-y-3">
            <Field label="Angle">
              <Segmented
                label="Phone angle"
                value={tilt ? 'tilt' : 'front'}
                onChange={(v) => onChange({ ...image, frame: v })}
                options={[
                  { value: 'front', label: 'Face forward' },
                  { value: 'tilt', label: '45 degrees' },
                ]}
              />
            </Field>
            <Field label={pair ? 'Turned' : 'Screen faces'}>
              <Segmented
                label={pair ? 'Which way the phones turn' : 'Which way the screen faces'}
                value={image.flip ? 'flip' : 'normal'}
                onChange={(v) => onChange({ ...image, flip: v === 'flip' })}
                options={pair ? [{ value: 'normal', label: 'Towards each other', disabled: !tilt }, { value: 'flip', label: 'Apart', disabled: !tilt }] : [{ value: 'flip', label: 'Left', disabled: !tilt }, { value: 'normal', label: 'Right', disabled: !tilt }]}
              />
            </Field>
          </div>
          {!tilt && <p className="-mt-1 text-xs text-muted-foreground">A face-forward phone looks the same either way.</p>}
          <div className="flex items-start gap-2">
            <Checkbox id={`${altId}-slide`} checked={!!image.slide && !pair} disabled={pair} onCheckedChange={(v) => onChange({ ...image, slide: v === true || undefined })} className="mt-0.5" />
            <div className="space-y-1">
              <Label htmlFor={`${altId}-slide`} className={cn(pair && 'text-muted-foreground')}>
                Slide to the other end when the cursor is over it
              </Label>
              <p className="text-xs text-muted-foreground">
                {pair ? 'Only for one phone.' : 'The phone slowly slides to the other end of the screenshot (a top view slides up to the bottom, a bottom view down to the top), and back when the cursor leaves. Mouse only: on a touch screen it stays still.'}
              </p>
            </div>
          </div>
          <Field label="App background" hint="Fills any part of the screen the screenshot does not cover. Use the app’s own background colour.">
            <div className="flex items-center gap-2">
              <input type="color" aria-label="App background colour" value={image.bg ?? '#ffffff'} onChange={(e) => onChange({ ...image, bg: e.target.value })} className="h-9 w-12 cursor-pointer rounded-md border bg-background p-1" />
              <span className="text-sm tabular-nums text-muted-foreground">{(image.bg ?? '#ffffff').toUpperCase()}</span>
            </div>
          </Field>
        </>
      )}
    </div>
  );
}

const FRAME_FIT = { value: 'frame' as const, label: 'Screenshot in a phone', hint: 'Your plain app screenshot, put inside an iPhone for you: face forward or turned 45 degrees, one phone or two. The same as the home page.' };
export const PHONE_FITS = [
  FRAME_FIT,
  { value: 'phone' as const, label: 'Ready-made phone', hint: 'A transparent crop of a phone, already framed, that rises out of the bottom of the card.' },
  { value: 'photo' as const, label: 'Photo', hint: 'Fills the whole card, cropped to fit.' },
];
export const MEDIA_FITS = [
  FRAME_FIT,
  { value: 'phone' as const, label: 'Ready-made phone', hint: 'A transparent crop of a phone, already framed, that rises out of the bottom of the card.' },
  { value: 'contain' as const, label: 'Shown whole', hint: 'The whole picture, centred with room round it. Good for a phone beside a watch.' },
  { value: 'photo' as const, label: 'Photo', hint: 'Fills the whole card, cropped to fit.' },
];
export const BANNER_FITS = [
  { value: 'photo' as const, label: 'Fill', hint: 'Fills the whole frame, cropped to fit.' },
  { value: 'contain' as const, label: 'Shown whole', hint: 'The whole picture on the section colour, never cropped.' },
];

/** A growing list of rows (cards, topics, reasons), each with move and remove buttons. */
export function RowList<T>({
  items,
  onChange,
  render,
  blank,
  noun,
  max,
  min = 1,
}: {
  items: T[];
  onChange: (items: T[]) => void;
  render: (item: T, update: (patch: Partial<T>) => void, index: number) => ReactNode;
  blank: () => T;
  noun: string;
  max: number;
  min?: number;
}) {
  const move = (i: number, by: number) => {
    const next = [...items];
    const [x] = next.splice(i, 1);
    next.splice(i + by, 0, x);
    onChange(next);
  };
  return (
    <div className="space-y-3">
      {items.map((item, i) => (
        <div key={i} className="rounded-lg border bg-background">
          <div className="flex items-center border-b px-3 py-1">
            <span className="text-sm font-medium capitalize">
              {noun} {i + 1}
            </span>
            <span className="ml-auto flex">
              <Button type="button" variant="ghost" size="icon" className="h-8 w-8" aria-label={`Move ${noun} ${i + 1} up`} disabled={i === 0} onClick={() => move(i, -1)}>
                <ArrowUp className="h-4 w-4" />
              </Button>
              <Button type="button" variant="ghost" size="icon" className="h-8 w-8" aria-label={`Move ${noun} ${i + 1} down`} disabled={i === items.length - 1} onClick={() => move(i, 1)}>
                <ArrowDown className="h-4 w-4" />
              </Button>
              <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" aria-label={`Remove ${noun} ${i + 1}`} disabled={items.length <= min} onClick={() => onChange(items.filter((_, j) => j !== i))}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </span>
          </div>
          <div className="space-y-3 p-3">{render(item, (patch) => onChange(items.map((x, j) => (j === i ? { ...x, ...patch } : x))), i)}</div>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" disabled={items.length >= max} onClick={() => onChange([...items, blank()])}>
        <Plus className="mr-2 h-4 w-4" /> Add {noun}
        {items.length >= max && ` (up to ${max})`}
      </Button>
    </div>
  );
}

/** A video file picker. Knows only the address; the page builder uploads on Save. */
export function VideoFileInput({ url, fileName, onChange }: { url: string; fileName?: string; onChange: (url: string, fileName: string) => void }) {
  const addFile = useAddFile();
  return (
    <div className="flex flex-wrap items-center gap-3">
      <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-muted focus-within:ring-2 focus-within:ring-ring">
        <Video className="h-4 w-4" /> {url ? 'Replace the video' : 'Choose a video file'}
        <input
          type="file"
          accept="video/mp4,video/webm,video/quicktime"
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = '';
            const local = file ? addFile(file, 'video') : null;
            if (local && file) onChange(local, file.name);
          }}
        />
      </label>
      {fileName && <span className="truncate text-sm text-muted-foreground">{fileName}</span>}
    </div>
  );
}
