import { Calculator, HandCoins, KeyRound, Landmark, PiggyBank, type LucideIcon } from 'lucide-react';
import { FadeImage } from '@/components/cuppi/fade-image';
import { TILE_COLOURS, TileShell } from '@/components/cuppi/feature-icon';
import type { ToolGlyph } from '@/lib/tools/registry';
import type { ResolvedTool } from '@/lib/tools/settings';

const GLYPHS: Record<ToolGlyph, LucideIcon> = {
  calculator: Calculator,
  'piggy-bank': PiggyBank,
  landmark: Landmark,
  'key-round': KeyRound,
  'hand-coins': HandCoins,
};

/**
 * A tool's icon, built exactly like the app's own (the same squircle tile as a feature's). When the admin has
 * uploaded a picture for it, that sits on the tile; until then, a simple white symbol does.
 * `className` sets the size (e.g. "h-10 w-10").
 */
export function ToolTile({
  tool,
  className,
  muted,
  eager,
  instant,
}: {
  tool: Pick<ResolvedTool, 'glyph' | 'tile' | 'iconUrl'>;
  className?: string;
  muted?: boolean;
  /** Download now, quietly: for tiles inside a menu that is shown on hover (see AppTile). */
  eager?: boolean;
  /** No fade-in: for tiles inside a menu that is hidden until opened. */
  instant?: boolean;
}) {
  const Glyph = GLYPHS[tool.glyph] ?? Calculator;
  return (
    <TileShell colours={TILE_COLOURS[tool.tile]} className={className} muted={muted}>
      {tool.iconUrl ? (
        <FadeImage
          src={tool.iconUrl}
          alt=""
          width={512}
          height={512}
          sizes="96px"
          instant={instant}
          {...(eager ? { loading: 'eager' as const, fetchPriority: 'low' as const } : {})}
          className="relative h-[66%] w-[66%] object-contain"
        />
      ) : (
        <Glyph className="relative h-[48%] w-[48%] text-white" aria-hidden />
      )}
    </TileShell>
  );
}
