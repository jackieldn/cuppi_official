'use client';

import { ArrowDown, ArrowUp, Images, Plus, Trash2, Type } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import type { AppKind } from '@/lib/showcase';
import { ImagePicker, MultiImagePicker, type DraftImage, type ReadImage } from './image-fields';
import { Segmented } from './segmented';

export type DraftGallery = { id: string; type: 'gallery'; title: string; images: DraftImage[] };
export type DraftFeature = {
  id: string;
  type: 'feature';
  title: string;
  body: string;
  textSide: 'left' | 'right';
  image: DraftImage | null;
};
export type DraftSection = DraftGallery | DraftFeature;

const newId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `s-${Date.now()}-${Math.random().toString(36).slice(2)}`;

export const blankGallery = (): DraftGallery => ({ id: newId(), type: 'gallery', title: '', images: [] });
export const blankFeature = (): DraftFeature => ({
  id: newId(),
  type: 'feature',
  title: '',
  body: '',
  textSide: 'left',
  image: null,
});

interface SectionEditorProps {
  sections: DraftSection[];
  onChange: (next: DraftSection[]) => void;
  readImage: ReadImage;
  kind: AppKind;
}

/**
 * Builds the body of an app's or website's page: any number of screenshot galleries and
 * text-and-image blocks, in any order. What's here is exactly what shows on the page, top
 * to bottom, below the intro.
 */
export function SectionEditor({ sections, onChange, readImage, kind }: SectionEditorProps) {
  const update = (id: string, patch: Partial<DraftGallery> | Partial<DraftFeature>) =>
    onChange(sections.map((s) => (s.id === id ? ({ ...s, ...patch } as DraftSection) : s)));
  const move = (index: number, delta: number) => {
    const next = [...sections];
    const [item] = next.splice(index, 1);
    next.splice(index + delta, 0, item);
    onChange(next);
  };
  const remove = (id: string) => onChange(sections.filter((s) => s.id !== id));

  return (
    <div className="space-y-4">
      {sections.length === 0 && (
        <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          No sections yet. Add screenshots or a text &amp; image block to build the page below the intro.
        </p>
      )}

      {sections.map((section, index) => (
        <div key={section.id} className="rounded-lg border bg-muted/20">
          <div className="flex items-center gap-2 border-b px-4 py-2">
            {section.type === 'gallery' ? <Images className="h-4 w-4 text-muted-foreground" /> : <Type className="h-4 w-4 text-muted-foreground" />}
            <span className="text-sm font-medium">
              {index + 1}. {section.type === 'gallery' ? 'Screenshots' : 'Text & image'}
            </span>
            <span className="ml-auto flex items-center">
              <Button type="button" variant="ghost" size="icon" className="h-8 w-8" disabled={index === 0} aria-label="Move section up" onClick={() => move(index, -1)}>
                <ArrowUp className="h-4 w-4" />
              </Button>
              <Button type="button" variant="ghost" size="icon" className="h-8 w-8" disabled={index === sections.length - 1} aria-label="Move section down" onClick={() => move(index, 1)}>
                <ArrowDown className="h-4 w-4" />
              </Button>
              <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" aria-label="Remove section" onClick={() => remove(section.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </span>
          </div>

          <div className="space-y-4 p-4">
            {section.type === 'gallery' ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor={`${section.id}-title`}>Heading <span className="font-normal text-muted-foreground">(optional)</span></Label>
                  <Input
                    id={`${section.id}-title`}
                    value={section.title}
                    onChange={(e) => update(section.id, { title: e.target.value })}
                    placeholder="Screenshots"
                    className="max-w-md"
                  />
                </div>
                <MultiImagePicker value={section.images} onChange={(images) => update(section.id, { images })} readImage={readImage} />
                <p className="text-xs text-muted-foreground">
                  {kind === 'app'
                    ? 'Shown in phone frames, up to four across. Phone screenshots look best.'
                    : 'Shown in browser windows, two across. Landscape screenshots look best.'}
                </p>
              </>
            ) : (
              <>
                <div className="space-y-2">
                  <Label>Layout</Label>
                  <div>
                    <Segmented
                      label="Text position"
                      value={section.textSide}
                      onChange={(textSide) => update(section.id, { textSide })}
                      options={[
                        { value: 'left', label: <><LayoutGlyph textSide="left" /> Text left</> },
                        { value: 'right', label: <><LayoutGlyph textSide="right" /> Text right</> },
                      ]}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`${section.id}-title`}>Heading</Label>
                  <Input
                    id={`${section.id}-title`}
                    value={section.title}
                    onChange={(e) => update(section.id, { title: e.target.value })}
                    placeholder="What this part is about"
                    className="max-w-md"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`${section.id}-body`}>Text</Label>
                  <Textarea
                    id={`${section.id}-body`}
                    rows={5}
                    value={section.body}
                    onChange={(e) => update(section.id, { body: e.target.value })}
                    onKeyDown={(e) => boldItalicShortcut(e, (body) => update(section.id, { body }))}
                  />
                  <p className="text-xs text-muted-foreground">A blank line starts a new paragraph. Ctrl+B and Ctrl+I make the selection bold or italic.</p>
                </div>
                <ImagePicker
                  label="Image"
                  value={section.image}
                  onChange={(image) => update(section.id, { image })}
                  readImage={readImage}
                  hint={kind === 'app' ? 'Shown in a phone frame.' : 'Shown in a browser window.'}
                />
              </>
            )}
          </div>
        </div>
      ))}

      <div className="flex flex-wrap gap-3">
        <Button type="button" variant="outline" onClick={() => onChange([...sections, blankGallery()])}>
          <Plus className="mr-2 h-4 w-4" /> Screenshots
        </Button>
        <Button type="button" variant="outline" onClick={() => onChange([...sections, blankFeature()])}>
          <Plus className="mr-2 h-4 w-4" /> Text &amp; image
        </Button>
      </div>
    </div>
  );
}

/** A tiny picture of the layout: lines of text on one side, a block for the image on the other. */
function LayoutGlyph({ textSide }: { textSide: 'left' | 'right' }) {
  const text = (
    <span className="flex w-3 flex-col justify-center gap-[2px]">
      <i className="h-[2px] rounded bg-current" />
      <i className="h-[2px] rounded bg-current" />
      <i className="h-[2px] w-2 rounded bg-current" />
    </span>
  );
  const image = <i className="w-3 rounded-[2px] bg-current opacity-50" />;
  return (
    <span aria-hidden="true" className={cn('inline-flex h-4 w-7 items-stretch gap-[2px]')}>
      {textSide === 'left' ? <>{text}{image}</> : <>{image}{text}</>}
    </span>
  );
}

/** Ctrl/Cmd+B and +I wrap the selection in <b> / <i>, which the page keeps. */
function boldItalicShortcut(e: React.KeyboardEvent<HTMLTextAreaElement>, set: (value: string) => void) {
  if (!(e.metaKey || e.ctrlKey) || (e.key !== 'b' && e.key !== 'i')) return;
  e.preventDefault();
  const target = e.currentTarget;
  const { selectionStart, selectionEnd, value } = target;
  const tag = e.key;
  set(`${value.slice(0, selectionStart)}<${tag}>${value.slice(selectionStart, selectionEnd)}</${tag}>${value.slice(selectionEnd)}`);
  // Keep the selection on the same words, after the opening tag.
  requestAnimationFrame(() => {
    target.selectionStart = selectionStart + 3;
    target.selectionEnd = selectionEnd + 3;
  });
}
