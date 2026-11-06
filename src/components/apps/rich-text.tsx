'use client';

import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { sanitizeHtml } from '@/lib/sanitize-html';

/**
 * Text written in the admin: plain, with blank lines as paragraph breaks. Basic tags
 * (<b>, <i>, links) still work, as entries saved by the old admin used them; anything
 * else is stripped by the sanitiser.
 */
export function RichText({ text, className }: { text: string; className?: string }) {
  const html = useMemo(() => sanitizeHtml(text), [text]);
  return <div className={cn('whitespace-pre-line', className)} dangerouslySetInnerHTML={{ __html: html }} />;
}
