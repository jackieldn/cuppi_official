'use client';

// A small rich text editor for Journal posts: bold, italic, underline,
// headings, lists, quotes, links and pictures uploaded to Storage. It edits
// HTML in place (contentEditable) and hands the sanitised HTML back on every
// change. Everything it produces is sanitised again when a post is shown.

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { getDownloadURL, ref, uploadBytesResumable, type FirebaseStorage } from 'firebase/storage';
import {
  Bold,
  Heading2,
  Heading3,
  ImagePlus,
  Italic,
  Link2,
  List,
  ListOrdered,
  Quote,
  Redo2,
  RemoveFormatting,
  Underline,
  Undo2,
  Unlink,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { sanitizeJournalHtml } from '@/lib/sanitize-html';

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

interface RichTextEditorProps {
  id?: string;
  /** The HTML to start with. Changing it later doesn't reset the editor; remount with a new key. */
  initialHtml: string;
  onChange: (html: string) => void;
  storage: FirebaseStorage | null;
  /** Storage folder the pictures go in, without a trailing slash. */
  imageFolder: string;
  placeholder?: string;
}

function uploadImage(storage: FirebaseStorage, path: string, file: File): Promise<string> {
  const task = uploadBytesResumable(ref(storage, path), file, { contentType: file.type });
  return new Promise((resolve, reject) => {
    task.on('state_changed', undefined, reject, async () => resolve(await getDownloadURL(task.snapshot.ref)));
  });
}

/** Only web and mail links; a bare "example.com" gets https:// in front. */
function cleanUrl(input: string): string | null {
  const value = input.trim();
  if (!value) return null;
  if (/^(https?:|mailto:)/i.test(value)) return value;
  if (/^[a-z][a-z0-9+.-]*:/i.test(value)) return null;
  return `https://${value}`;
}

export function RichTextEditor({ id, initialHtml, onChange, storage, imageFolder, placeholder }: RichTextEditorProps) {
  const { toast } = useToast();
  const editorRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  // Where the cursor was before the toolbar or file picker took focus.
  const rangeRef = useRef<Range | null>(null);
  const [uploading, setUploading] = useState(false);
  const [empty, setEmpty] = useState(!initialHtml);

  // Set once: React must not rewrite the editor's content while it's being typed in.
  useEffect(() => {
    if (editorRef.current) editorRef.current.innerHTML = sanitizeJournalHtml(initialHtml);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const emit = useCallback(() => {
    const el = editorRef.current;
    if (!el) return;
    const html = sanitizeJournalHtml(el.innerHTML);
    setEmpty(!/<img\b/i.test(html) && !el.textContent?.trim());
    onChange(html);
  }, [onChange]);

  // Remember the cursor whenever it's inside the editor.
  useEffect(() => {
    const onSelection = () => {
      const sel = document.getSelection();
      const el = editorRef.current;
      if (sel && sel.rangeCount > 0 && el?.contains(sel.anchorNode)) rangeRef.current = sel.getRangeAt(0).cloneRange();
    };
    document.addEventListener('selectionchange', onSelection);
    return () => document.removeEventListener('selectionchange', onSelection);
  }, []);

  const restoreSelection = () => {
    const el = editorRef.current;
    if (!el) return;
    el.focus();
    const range = rangeRef.current;
    if (range && el.contains(range.startContainer)) {
      const sel = document.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
    }
  };

  const run = (command: string, value?: string) => {
    restoreSelection();
    // execCommand is deprecated but is still the one thing every browser supports for this.
    document.execCommand(command, false, value);
    emit();
  };

  const block = (tag: 'h2' | 'h3' | 'blockquote') => {
    restoreSelection();
    // Pressing the same heading twice turns it back into a paragraph.
    const current = document.queryCommandValue('formatBlock').toLowerCase().replace(/[<>]/g, '');
    document.execCommand('formatBlock', false, current === tag ? 'p' : tag);
    emit();
  };

  const addLink = () => {
    restoreSelection();
    const sel = document.getSelection();
    if (!sel || sel.isCollapsed) {
      toast({ title: 'Select the words to link first.' });
      return;
    }
    const url = cleanUrl(window.prompt('Link to (web address or email):', 'https://') ?? '');
    if (!url) return;
    run('createLink', url);
  };

  const handleFile = async (file: File | undefined) => {
    if (fileRef.current) fileRef.current.value = '';
    if (!file || !storage) return;
    if (!file.type.startsWith('image/')) {
      toast({ variant: 'destructive', title: 'Pictures only', description: 'Choose an image file.' });
      return;
    }
    if (file.size >= MAX_IMAGE_BYTES) {
      toast({ variant: 'destructive', title: 'Too big', description: 'Pictures can be up to 10 MB.' });
      return;
    }
    setUploading(true);
    try {
      const safeName = file.name.replace(/[^\w.-]+/g, '_');
      const url = await uploadImage(storage, `${imageFolder}/${Date.now()}_${safeName}`, file);
      restoreSelection();
      document.execCommand('insertImage', false, url);
      // Give the new picture the file's name as its alt text.
      editorRef.current?.querySelectorAll('img').forEach((img) => {
        if (img.getAttribute('src') === url && !img.alt) img.alt = file.name.replace(/\.[^.]+$/, '');
      });
      emit();
    } catch (error) {
      console.error('Journal picture upload failed:', error);
      // Storage errors carry a code such as storage/unauthorized; show it so the cause isn't a mystery.
      const code = (error as { code?: string } | null)?.code;
      toast({
        variant: 'destructive',
        title: 'Upload failed',
        description: code ? `The picture could not be added (${code}).` : 'The picture could not be added.',
      });
    } finally {
      setUploading(false);
    }
  };

  // Pasted text keeps its basic formatting but none of the page it came from.
  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const html = e.clipboardData.getData('text/html');
    if (html) document.execCommand('insertHTML', false, sanitizeJournalHtml(html));
    else document.execCommand('insertText', false, e.clipboardData.getData('text/plain'));
    emit();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!(e.ctrlKey || e.metaKey) || e.altKey) return;
    if (e.key.toLowerCase() === 'k') {
      e.preventDefault();
      addLink();
    }
  };

  // Toolbar buttons mustn't steal the cursor from the text.
  const tool = (label: string, icon: ReactNode, action: () => void, extra?: { disabled?: boolean }) => (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={extra?.disabled}
      className="inline-flex h-8 w-8 items-center justify-center rounded-md text-foreground/80 hover:bg-secondary hover:text-foreground disabled:opacity-40"
      onMouseDown={(e) => e.preventDefault()}
      onClick={action}
    >
      {icon}
    </button>
  );
  const divider = <span aria-hidden="true" className="mx-1 h-5 w-px bg-border" />;

  return (
    <div className="overflow-hidden rounded-md border border-input bg-background">
      <div role="toolbar" aria-label="Formatting" className="flex flex-wrap items-center gap-0.5 border-b bg-muted/40 p-1">
        {tool('Bold (Ctrl+B)', <Bold className="h-4 w-4" />, () => run('bold'))}
        {tool('Italic (Ctrl+I)', <Italic className="h-4 w-4" />, () => run('italic'))}
        {tool('Underline (Ctrl+U)', <Underline className="h-4 w-4" />, () => run('underline'))}
        {divider}
        {tool('Heading', <Heading2 className="h-4 w-4" />, () => block('h2'))}
        {tool('Subheading', <Heading3 className="h-4 w-4" />, () => block('h3'))}
        {tool('Quote', <Quote className="h-4 w-4" />, () => block('blockquote'))}
        {divider}
        {tool('Bulleted list', <List className="h-4 w-4" />, () => run('insertUnorderedList'))}
        {tool('Numbered list', <ListOrdered className="h-4 w-4" />, () => run('insertOrderedList'))}
        {divider}
        {tool('Add link (Ctrl+K)', <Link2 className="h-4 w-4" />, addLink)}
        {tool('Remove link', <Unlink className="h-4 w-4" />, () => run('unlink'))}
        {tool(uploading ? 'Uploading picture...' : 'Insert picture', <ImagePlus className="h-4 w-4" />, () => fileRef.current?.click(), {
          disabled: uploading || !storage,
        })}
        {divider}
        {tool('Clear formatting', <RemoveFormatting className="h-4 w-4" />, () => run('removeFormat'))}
        {tool('Undo', <Undo2 className="h-4 w-4" />, () => run('undo'))}
        {tool('Redo', <Redo2 className="h-4 w-4" />, () => run('redo'))}
        {uploading && <span className="ml-2 text-xs text-muted-foreground">Uploading...</span>}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          tabIndex={-1}
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
      </div>
      <div className="relative">
        {empty && placeholder && (
          <p className="pointer-events-none absolute left-3 top-2 text-sm text-muted-foreground">{placeholder}</p>
        )}
        <div
          id={id}
          ref={editorRef}
          role="textbox"
          aria-multiline="true"
          contentEditable
          suppressContentEditableWarning
          spellCheck
          onInput={emit}
          onBlur={emit}
          onPaste={handlePaste}
          onKeyDown={handleKeyDown}
          className={cn(
            'min-h-[300px] max-h-[55vh] overflow-y-auto px-3 py-2 text-sm leading-relaxed outline-none',
            '[&_h2]:mb-2 [&_h2]:mt-4 [&_h2]:text-xl [&_h2]:font-bold [&_h3]:mb-2 [&_h3]:mt-3 [&_h3]:text-lg [&_h3]:font-semibold',
            '[&_p]:mb-3 [&_ul]:mb-3 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:mb-3 [&_ol]:list-decimal [&_ol]:pl-6',
            '[&_blockquote]:mb-3 [&_blockquote]:border-l-4 [&_blockquote]:pl-3 [&_blockquote]:italic',
            '[&_a]:text-primary [&_a]:underline [&_img]:my-2 [&_img]:max-h-80 [&_img]:max-w-full [&_img]:rounded',
          )}
        />
      </div>
    </div>
  );
}
