import { Cake, House, PawPrint, Receipt, ShieldCheck, Sparkles, Trash2, Wallet, Palette, type LucideIcon } from 'lucide-react';
import type { FeatureIcon } from '@/lib/features-types';

const ICONS: Record<FeatureIcon, LucideIcon> = {
  home: House,
  cake: Cake,
  bin: Trash2,
  paw: PawPrint,
  receipt: Receipt,
  wallet: Wallet,
  palette: Palette,
  shield: ShieldCheck,
  sparkles: Sparkles,
};

export function FeatureGlyph({ icon, className }: { icon: FeatureIcon; className?: string }) {
  const Icon = ICONS[icon] ?? Sparkles;
  return <Icon className={className} aria-hidden />;
}
