import { Cake, House, MapPin, PawPrint, Receipt, ShieldCheck, Smartphone, Sparkles, Star, Trash2, Users, Wallet, type LucideIcon } from 'lucide-react';
import { FadeImage } from '@/components/cuppi/fade-image';
import { TILE_COLOURS, TileShell } from '@/components/cuppi/feature-icon';
import type { ReasonIcon } from '@/lib/compare-data';
import type { TileColour } from '@/lib/features-types';

/** The line icons a Why Cuppi tile can wear when it has no picture of its own. */
export const REASON_ICON_COMPONENTS: Record<ReasonIcon, LucideIcon> = {
  home: House,
  shield: ShieldCheck,
  phone: Smartphone,
  map: MapPin,
  cake: Cake,
  bin: Trash2,
  paw: PawPrint,
  receipt: Receipt,
  wallet: Wallet,
  users: Users,
  star: Star,
  sparkles: Sparkles,
};

/**
 * A Why Cuppi tile's icon: the app's glass squircle (see TileShell) in one of the tile colours, wearing the picture chosen for it
 * (a transparent glyph, as for a feature) or, without one, a white line icon. `className` sets the size.
 */
export function ReasonTile({ tile, icon, iconUrl, className }: { tile: TileColour; icon: ReasonIcon; iconUrl?: string; className?: string }) {
  const Icon = REASON_ICON_COMPONENTS[icon] ?? Sparkles;
  return (
    <TileShell colours={TILE_COLOURS[tile]} className={className}>
      {iconUrl ? (
        <FadeImage src={iconUrl} alt="" width={512} height={512} sizes="96px" className="relative h-[66%] w-[66%] object-contain" />
      ) : (
        <Icon className="relative h-[48%] w-[48%] text-white" aria-hidden />
      )}
    </TileShell>
  );
}
