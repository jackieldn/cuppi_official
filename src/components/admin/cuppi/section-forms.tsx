'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Segmented } from '@/components/admin/apps/segmented';
import { SECTION_LIMITS as L } from '@/lib/feature-sections';
import { videoKind } from '@/lib/safe-urls';
import type { FeatureBlock } from '@/lib/features-types';
import {
  BANNER_FITS,
  Field,
  ImageEditor,
  MEDIA_FITS,
  PHONE_FITS,
  PictureInput,
  RowList,
  TintField,
  VideoFileInput,
} from './section-fields';

type Of<T extends FeatureBlock['type']> = Extract<FeatureBlock, { type: T }>;
type Props<T extends FeatureBlock['type']> = { block: Of<T>; onChange: (patch: Partial<Of<T>>) => void };

const blankImage = (fit?: 'photo' | 'contain') => (fit ? { url: '', alt: '', fit } : { url: '', alt: '', fit: 'frame' as const, frame: 'front' as const });

/** The fields for one section, by template. Each form edits its block directly; nothing here knows about saving. */
export function SectionForm({ block, onChange }: { block: FeatureBlock; onChange: (patch: Partial<FeatureBlock>) => void }) {
  switch (block.type) {
    case 'showcase':
      return <ShowcaseForm block={block} onChange={onChange} />;
    case 'cards':
      return <CardsForm block={block} onChange={onChange} />;
    case 'callout':
      return <CalloutForm block={block} onChange={onChange} />;
    case 'points':
      return <PointsForm block={block} onChange={onChange} />;
    case 'tabs':
      return <TabsForm block={block} onChange={onChange} />;
    case 'banner':
      return <BannerForm block={block} onChange={onChange} />;
    case 'video':
      return <VideoForm block={block} onChange={onChange} />;
  }
}

const sideOptions = [
  { value: 'left' as const, label: 'Words left' },
  { value: 'right' as const, label: 'Words right' },
];

function ShowcaseForm({ block, onChange }: Props<'showcase'>) {
  return (
    <>
      <Field label="Label" optional hint="A small coloured chip above the heading.">
        <Input value={block.eyebrow ?? ''} maxLength={L.eyebrow} onChange={(e) => onChange({ eyebrow: e.target.value })} />
      </Field>
      <Field label="Heading">
        <Input value={block.title} maxLength={L.title} onChange={(e) => onChange({ title: e.target.value })} />
      </Field>
      <Field label="Words" hint="A blank line starts a new paragraph.">
        <Textarea rows={4} value={block.body} maxLength={L.body} onChange={(e) => onChange({ body: e.target.value })} />
      </Field>
      <Segmented label="Where the words go" value={block.side} onChange={(side) => onChange({ side })} options={sideOptions} />
      <TintField value={block.tint} onChange={(tint) => onChange({ tint })} label="Card colour" />
      <ImageEditor image={block.image} onChange={(image) => onChange({ image })} fits={PHONE_FITS} />
    </>
  );
}

function CardsForm({ block, onChange }: Props<'cards'>) {
  return (
    <>
      <Field label="Heading">
        <Input value={block.title} maxLength={L.title} onChange={(e) => onChange({ title: e.target.value })} />
      </Field>
      <Field label="Words under it" optional>
        <Textarea rows={2} value={block.intro ?? ''} maxLength={L.intro} onChange={(e) => onChange({ intro: e.target.value })} />
      </Field>
      <RowList
        noun="card"
        max={L.items}
        items={block.cards}
        onChange={(cards) => onChange({ cards })}
        blank={() => ({ title: '', body: '', image: blankImage() })}
        render={(card, update) => (
          <>
            <Field label="Title">
              <Input value={card.title} maxLength={L.title} onChange={(e) => update({ title: e.target.value })} />
            </Field>
            <Field label="Words">
              <Textarea rows={3} value={card.body} maxLength={L.body} onChange={(e) => update({ body: e.target.value })} />
            </Field>
            <ImageEditor image={card.image} onChange={(image) => update({ image })} fits={PHONE_FITS} />
          </>
        )}
      />
      <Field label="Small print" optional hint="One note per line, shown under the cards (for asterisked notes).">
        <Textarea rows={2} value={(block.footnotes ?? []).join('\n')} onChange={(e) => onChange({ footnotes: e.target.value.split('\n').slice(0, L.notes) })} />
      </Field>
    </>
  );
}

function CalloutForm({ block, onChange }: Props<'callout'>) {
  return (
    <>
      <Field label="The sentence" hint="Shown large, in italics, on a colour band.">
        <Textarea rows={3} value={block.title} maxLength={L.title} onChange={(e) => onChange({ title: e.target.value })} />
      </Field>
      <Field label="A line under it" optional>
        <Input value={block.body ?? ''} maxLength={L.intro} onChange={(e) => onChange({ body: e.target.value })} />
      </Field>
      <TintField value={block.tint} onChange={(tint) => onChange({ tint })} label="Band colour" />
    </>
  );
}

function PointsForm({ block, onChange }: Props<'points'>) {
  return (
    <>
      <Field label="Heading" optional>
        <Input value={block.title ?? ''} maxLength={L.title} onChange={(e) => onChange({ title: e.target.value })} />
      </Field>
      <RowList
        noun="reason"
        max={L.items}
        items={block.items}
        onChange={(items) => onChange({ items })}
        blank={() => ({ title: '', body: '' })}
        render={(item, update) => (
          <>
            <Field label="Title">
              <Input value={item.title} maxLength={L.title} onChange={(e) => update({ title: e.target.value })} />
            </Field>
            <Field label="Words">
              <Textarea rows={2} value={item.body} maxLength={L.body} onChange={(e) => update({ body: e.target.value })} />
            </Field>
          </>
        )}
      />
    </>
  );
}

function TabsForm({ block, onChange }: Props<'tabs'>) {
  return (
    <>
      <Field label="Heading" optional>
        <Input value={block.title ?? ''} maxLength={L.title} onChange={(e) => onChange({ title: e.target.value })} />
      </Field>
      <Field label="Words under it" optional>
        <Textarea rows={2} value={block.intro ?? ''} maxLength={L.intro} onChange={(e) => onChange({ intro: e.target.value })} />
      </Field>
      <Segmented label="Where the list goes" value={block.side} onChange={(side) => onChange({ side })} options={[{ value: 'left', label: 'List left' }, { value: 'right', label: 'List right' }]} />
      <TintField value={block.tint} onChange={(tint) => onChange({ tint })} label="Card colour" />
      <RowList
        noun="topic"
        max={L.items}
        items={block.items}
        onChange={(items) => onChange({ items })}
        blank={() => ({ title: '', body: '', image: blankImage() })}
        render={(item, update) => (
          <>
            <Field label="Title">
              <Input value={item.title} maxLength={L.title} onChange={(e) => update({ title: e.target.value })} />
            </Field>
            <Field label="Words">
              <Textarea rows={4} value={item.body} maxLength={L.body} onChange={(e) => update({ body: e.target.value })} />
            </Field>
            <ImageEditor image={item.image} onChange={(image) => update({ image })} fits={MEDIA_FITS} label="Picture shown when this topic is open" />
          </>
        )}
      />
    </>
  );
}

function BannerForm({ block, onChange }: Props<'banner'>) {
  return (
    <>
      <Field label="Heading" optional>
        <Input value={block.title ?? ''} maxLength={L.title} onChange={(e) => onChange({ title: e.target.value })} />
      </Field>
      <Field label="Words under it" optional>
        <Textarea rows={2} value={block.intro ?? ''} maxLength={L.intro} onChange={(e) => onChange({ intro: e.target.value })} />
      </Field>
      <ImageEditor image={block.image} onChange={(image) => onChange({ image })} fits={BANNER_FITS} hint="A wide picture works best (about 16:9)." />
      <TintField value={block.tint} onChange={(tint) => onChange({ tint })} label="Colour behind it" hint="Only shows if the picture does not fill the frame." />
    </>
  );
}

type Placement = 'full' | 'text-left' | 'text-right';

function VideoForm({ block, onChange }: Props<'video'>) {
  const { video } = block;
  const patchVideo = (patch: Partial<typeof video>) => onChange({ video: { ...video, ...patch } });
  // A video already uploaded (or just chosen) is a file; anything else is a link. The tab is the admin's choice until Save.
  const isFile = video.url.startsWith('blob:') || video.url.includes('firebasestorage.googleapis.com');
  const [mode, setMode] = useState<'link' | 'upload'>(isFile ? 'upload' : 'link');
  const [fileName, setFileName] = useState<string>();
  const placement: Placement = block.layout === 'full' ? 'full' : block.side === 'right' ? 'text-right' : 'text-left';
  const kind = video.url.startsWith('blob:') ? 'file' : videoKind(video.url);

  return (
    <>
      <Segmented
        label="Where the video comes from"
        value={mode}
        onChange={(m) => {
          setMode(m);
          if (m !== (isFile ? 'upload' : 'link')) patchVideo({ url: '' });
        }}
        options={[
          { value: 'link', label: 'YouTube or link' },
          { value: 'upload', label: 'Upload a file' },
        ]}
      />
      {mode === 'link' ? (
        <Field
          label="Video link"
          htmlFor={`${block.id}-url`}
          hint={
            !video.url
              ? 'A YouTube link (including Shorts), or the https address of an .mp4 file. YouTube plays only when a visitor presses play, so the page sets no cookies.'
              : kind === 'youtube'
                ? 'YouTube video recognised.'
                : kind === 'file'
                  ? 'Plays as a video file.'
                  : 'That is not a YouTube link or an https address.'
          }
        >
          <Input id={`${block.id}-url`} value={video.url} placeholder="https://www.youtube.com/watch?v=…" onChange={(e) => patchVideo({ url: e.target.value })} />
        </Field>
      ) : (
        <Field label="Video file" hint="MP4 (H.264) plays everywhere. WebM and iPhone .mov also work in most browsers. Up to 200 MB; it uploads when you press Save.">
          <VideoFileInput url={video.url} fileName={fileName} onChange={(url, name) => { patchVideo({ url }); setFileName(name); }} />
        </Field>
      )}

      <Field label="Shape" hint={video.aspect === '9:16' ? 'Phone-shaped: Shorts, Reels, a screen recording. It stands in a colour card so it is not a sliver.' : 'Widescreen: fills the width of the page.'}>
        <Segmented
          label="Video shape"
          value={video.aspect}
          onChange={(aspect) => patchVideo({ aspect })}
          options={[
            { value: '16:9', label: <><Shape tall={false} /> Widescreen 16:9</> },
            { value: '9:16', label: <><Shape tall /> Phone 9:16</> },
          ]}
        />
      </Field>

      <Field label="Layout">
        <Segmented
          label="Layout"
          value={placement}
          onChange={(p) => onChange(p === 'full' ? { layout: 'full' } : { layout: 'split', side: p === 'text-right' ? 'right' : 'left' })}
          options={[
            { value: 'full', label: 'Full width' },
            { value: 'text-left', label: 'Words left' },
            { value: 'text-right', label: 'Words right' },
          ]}
        />
      </Field>

      <Field label="Label" optional hint="A small coloured chip above the heading, like “Tutorial”.">
        <Input value={block.eyebrow ?? ''} maxLength={L.eyebrow} onChange={(e) => onChange({ eyebrow: e.target.value })} />
      </Field>
      <Field label="Heading" optional>
        <Input value={block.title ?? ''} maxLength={L.title} onChange={(e) => onChange({ title: e.target.value })} />
      </Field>
      <Field label="Words" optional>
        <Textarea rows={3} value={block.body ?? ''} maxLength={L.body} onChange={(e) => onChange({ body: e.target.value })} />
      </Field>
      <TintField value={block.tint} onChange={(tint) => onChange({ tint })} hint="The chip, and the card behind a phone-shaped video." />
      <PictureInput label="Cover picture" url={video.poster ?? ''} onChange={(poster) => patchVideo({ poster: poster || undefined })} hint="Optional. YouTube supplies its own; for a video file it replaces the first frame." empty="Choose a cover" />
      <Field label="What the video shows" optional hint="Read out by screen readers.">
        <Input value={video.label ?? ''} maxLength={L.label} onChange={(e) => patchVideo({ label: e.target.value })} />
      </Field>
    </>
  );
}

function Shape({ tall }: { tall: boolean }) {
  return <span aria-hidden className={tall ? 'inline-block h-4 w-2.5 rounded-[3px] border-2 border-current' : 'inline-block h-2.5 w-4 rounded-[3px] border-2 border-current'} />;
}
