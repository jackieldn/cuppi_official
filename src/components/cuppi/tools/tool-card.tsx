import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ResolvedTool } from '@/lib/tools/settings';
import { TINTS } from '../blocks/tints';
import { ToolTile } from './tool-tile';

/** A link to a tool: its tile, name and one line, on its own colour. Used on the Tools page and under each tool. */
export function ToolCard({ tool, size = 'large' }: { tool: ResolvedTool; size?: 'large' | 'small' }) {
  const tint = TINTS[tool.tint];
  return (
    <Link
      href={`/tools/${tool.slug}`}
      className={cn(
        'group flex items-center gap-5 transition-transform duration-500 [transition-timing-function:var(--ease-spring)] hover:-translate-y-1',
        size === 'large' ? 'min-h-[9.5rem] rounded-[2rem] p-6' : 'rounded-[1.75rem] p-5',
        tint.surface,
        tint.text,
      )}
    >
      <ToolTile tool={tool} className={size === 'large' ? 'h-16 w-16' : 'h-14 w-14'} />
      <span className="min-w-0 flex-1">
        <span className={cn('block font-headline font-normal leading-tight', size === 'large' ? 'text-2xl' : 'text-xl')}>{tool.name}</span>
        <span className={cn('mt-1 block', tint.muted)}>{tool.tagline}</span>
      </span>
      <ArrowUpRight className="h-5 w-5 shrink-0 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden />
    </Link>
  );
}
