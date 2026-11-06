import { cn } from '@/lib/utils';
import { STATUS_LABEL, type AppStatus } from '@/lib/showcase';

const STYLE: Record<AppStatus, { pill: string; dot: string }> = {
  // A dark backing on all three: the pill also sits on bright, tinted cover art.
  live: { pill: 'bg-background/80 text-palette-lagoon border-palette-lagoon/50', dot: 'bg-palette-lagoon' },
  testflight: { pill: 'bg-background/80 text-accent border-accent/50', dot: 'bg-accent' },
  decommissioned: { pill: 'bg-background/80 text-muted-foreground border-border/40', dot: 'bg-muted-foreground/60' },
};

/** Live / TestFlight / Decommissioned, as a small pill with a status dot. */
export function StatusBadge({ status, className }: { status: AppStatus; className?: string }) {
  const style = STYLE[status];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold backdrop-blur-sm',
        style.pill,
        className
      )}
    >
      <span
        aria-hidden="true"
        className={cn('h-1.5 w-1.5 rounded-full', style.dot, status === 'live' && 'animate-pulse motion-reduce:animate-none')}
      />
      {STATUS_LABEL[status]}
    </span>
  );
}
