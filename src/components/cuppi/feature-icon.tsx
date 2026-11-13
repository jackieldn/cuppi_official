import Image from 'next/image';
import { Cake, House, PawPrint, Receipt, ShieldCheck, Sparkles, Star, Trash2, User, Users, Wallet, Palette, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Feature, FeatureIcon, TileColour } from '@/lib/features-types';
import { CUPPI_LOGO } from '@/lib/brand-assets';

const ICONS: Record<FeatureIcon, LucideIcon> = {
  home: House,
  cake: Cake,
  bin: Trash2,
  paw: PawPrint,
  receipt: Receipt,
  wallet: Wallet,
  palette: Palette,
  shield: ShieldCheck,
  user: User,
  users: Users,
  star: Star,
  sparkles: Sparkles,
};

// The tile colours from the app's Apps tab, sampled from its own icons. An icon is
// built from four values: a flat `fill`; an `edge` tint the fill eases into just
// inside the top and bottom (a few percent lighter); a `shine`, the brighter, more
// saturated band that sits at the very top and bottom; and a deeper `line`, the
// 1px outline.
type TileSet = { fill: string; edge: string; shine: string; line: string };
const TILE_COLOURS: Record<TileColour, TileSet> = {
  pink: { fill: '#EA9EDB', edge: '#F2AAEB', shine: '#F6C8FB', line: '#E57FD0' },
  green: { fill: '#98B958', edge: '#A4C85E', shine: '#C9F56F', line: '#84A34A' },
  blue: { fill: '#A5CDFA', edge: '#AFD9FB', shine: '#CFF7FE', line: '#76B1F8' },
  amber: { fill: '#F1A423', edge: '#F7A922', shine: '#FFCA2E', line: '#D98F1F' },
};

// Cuppi's own tile: cream (#FFF3D7), built the same way as the rest. It is not a feature colour, so it
// is not in TileColour (the admin cannot pick it for a feature).
const CUPPI_TILE: TileSet = { fill: '#FFF3D7', edge: '#FFF7E4', shine: '#FFFEF8', line: '#F3D9A6' };

export function FeatureGlyph({ icon, className }: { icon: FeatureIcon; className?: string }) {
  const Icon = ICONS[icon] ?? Sparkles;
  return <Icon className={className} aria-hidden />;
}

/**
 * The squircle every app icon sits on: a flat colour with a 1px deeper outline and a thin shine at the
 * top and bottom that curves up into the corners. `className` sets the size (e.g. "h-10 w-10"). The
 * shine is sized in container units, so it stays in proportion at any size.
 */
function TileShell({
  colours: c,
  className,
  muted,
  children,
}: {
  colours: TileSet;
  className?: string;
  muted?: boolean;
  children: React.ReactNode;
}) {
  const line = 'max(1px, 0.5cqw)'; // the outline
  const shine = 'max(0.75px, 1.1cqw)'; // the band inside it
  return (
    <span
      aria-hidden
      className={cn('relative grid shrink-0 place-items-center [container-type:size]', muted && 'opacity-85 saturate-[0.75]', className)}
      style={{
        borderRadius: '27%',
        background: `linear-gradient(to bottom, ${c.edge} 0%, ${c.fill} 9%, ${c.fill} 91%, ${c.edge} 100%)`,
      }}
    >
      {/* Outline, then the two shine bands. An inset shadow pushed down (or up) leaves a
          crescent along the edge that thins and curves up round the corners. */}
      <span
        className="pointer-events-none absolute inset-0"
        style={{
          borderRadius: 'inherit',
          boxShadow: [
            `inset 0 0 0 ${line} ${c.line}`,
            `inset 0 calc(${line} + ${shine}) 0 0 ${c.shine}`,
            `inset 0 calc(-1 * (${line} + ${shine})) 0 0 ${c.shine}`,
          ].join(', '),
        }}
      />
      {children}
    </span>
  );
}

/**
 * A feature's icon as it appears in the app: the tile, with the 3D glyph centred on it.
 * A feature with no in-app glyph gets its line icon in white on the same tile.
 */
export function AppTile({
  feature,
  className,
  muted,
  eager,
}: {
  feature: Pick<Feature, 'iconUrl' | 'icon' | 'tile' | 'name'>;
  className?: string;
  /** Washed out, for features that are not available yet. */
  muted?: boolean;
  /**
   * Download now, quietly, instead of waiting until the tile is nearly on screen. For tiles that
   * appear with an animation or a click (the icon fan, the menu), where a picture arriving late
   * shows as a blank tile that then pops in.
   */
  eager?: boolean;
}) {
  return (
    <TileShell colours={TILE_COLOURS[feature.tile]} className={className} muted={muted}>
      {feature.iconUrl ? (
        <Image
          src={feature.iconUrl}
          alt=""
          width={512}
          height={512}
          sizes="96px"
          {...(eager ? { loading: 'eager' as const, fetchPriority: 'low' as const } : {})}
          className="relative h-[66%] w-[66%] object-contain"
        />
      ) : (
        <FeatureGlyph icon={feature.icon} className="relative h-[48%] w-[48%] text-white" />
      )}
    </TileShell>
  );
}

/** Cuppi's own icon: the house on a cream tile, built exactly like the feature tiles beside it. */
export function CuppiTile({ className, priority }: { className?: string; priority?: boolean }) {
  return (
    <TileShell colours={CUPPI_TILE} className={className}>
      <Image src={CUPPI_LOGO} alt="" width={380} height={397} priority={priority} className="relative h-[64%] w-[64%] object-contain" />
    </TileShell>
  );
}
