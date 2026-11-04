'use client';

// The desktop's Journal: Jack's notes on coding sessions and things worth
// sharing, written at /admin/journal. Entries on the left, the open one on the
// right. Only published posts are visible; they're read once when it opens.

import { useMemo, useState } from 'react';
import { BookText } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { journalDate, journalHtml, type JournalPost } from '@/lib/poot-xp-types';
import { sanitizeJournalHtml } from '@/lib/sanitize-html';
import { useJournal } from '../xp/xp-apps';
import { AppWindow } from '../app-window';

export function JournalIcon() {
  return (
    <span className="relative flex size-14 items-center justify-center overflow-hidden rounded-[14px] bg-[linear-gradient(145deg,#2dd4bf_0%,#0ea5e9_55%,#4f46e5_100%)] shadow-[0_6px_16px_-4px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.35)]">
      <span aria-hidden="true" className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/25 to-transparent" />
      <BookText aria-hidden="true" className="relative size-7 text-white drop-shadow" strokeWidth={2.25} />
    </span>
  );
}

function Entry({ post }: { post: JournalPost }) {
  const html = useMemo(() => sanitizeJournalHtml(journalHtml(post)), [post]);
  return (
    <article>
      <h1 className="font-headline text-2xl font-bold leading-tight text-foreground">{post.title}</h1>
      <p className="mb-5 mt-1 text-xs text-muted-foreground">{journalDate(post.date)}</p>
      <div
        className={cn(
          'text-[14px] leading-relaxed text-foreground/90',
          '[&_h2]:mb-2 [&_h2]:mt-6 [&_h2]:font-headline [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-foreground',
          '[&_h3]:mb-2 [&_h3]:mt-5 [&_h3]:font-headline [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-accent',
          '[&_p]:mb-4 [&_ul]:mb-4 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:mb-4 [&_ol]:list-decimal [&_ol]:pl-6',
          '[&_blockquote]:mb-4 [&_blockquote]:border-l-2 [&_blockquote]:border-accent [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-foreground/70',
          '[&_a]:text-accent [&_a]:underline [&_a]:underline-offset-2',
          '[&_code]:rounded [&_code]:bg-secondary [&_code]:px-1 [&_code]:text-[13px] [&_pre]:mb-4 [&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:bg-secondary [&_pre]:p-3',
          '[&_img]:mb-4 [&_img]:h-auto [&_img]:max-w-full [&_img]:rounded-lg [&_hr]:my-6 [&_hr]:border-palette-lagoon/30',
        )}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </article>
  );
}

export function JournalApp() {
  const { items, failed } = useJournal();
  const [openId, setOpenId] = useState<string | null>(null);
  const post = items?.find((p) => p.id === openId) ?? items?.[0];

  return (
    <AppWindow id="journal" title="Journal" width={720}>
      <div className="flex h-[480px] border-t border-palette-lagoon/25">
        <nav aria-label="Entries" className="w-56 shrink-0 overflow-y-auto overscroll-contain border-r border-palette-lagoon/25 p-2">
          {!items && (
            <div className="space-y-2 p-1">
              {Array.from({ length: 4 }, (_, i) => (
                <Skeleton key={i} className="h-11 w-full" />
              ))}
            </div>
          )}
          {items?.length === 0 && (
            <p className="p-2 text-[13px] text-muted-foreground">
              {failed ? 'The journal could not be opened.' : 'No entries yet.'}
            </p>
          )}
          {items?.map((p) => {
            const current = post?.id === p.id;
            return (
              <button
                key={p.id}
                type="button"
                aria-current={current ? 'true' : undefined}
                onClick={() => setOpenId(p.id)}
                className={cn(
                  'flex w-full cursor-default flex-col gap-0.5 rounded-md px-2.5 py-2 text-left outline-none transition-colors hover:bg-secondary/60 focus-visible:ring-2 focus-visible:ring-ring',
                  current && 'bg-primary text-primary-foreground hover:bg-primary',
                )}
              >
                <span className="line-clamp-2 text-[13px] font-semibold leading-snug">{p.title}</span>
                <span className={cn('text-[11px]', current ? 'text-primary-foreground/75' : 'text-muted-foreground')}>
                  {journalDate(p.date)}
                </span>
              </button>
            );
          })}
        </nav>
        <div className="min-w-0 flex-1 overflow-y-auto overscroll-contain px-7 py-6">
          {post ? (
            <Entry key={post.id} post={post} />
          ) : (
            items && !failed && <p className="text-sm text-muted-foreground">Nothing to read yet. Come back soon!</p>
          )}
        </div>
      </div>
    </AppWindow>
  );
}
