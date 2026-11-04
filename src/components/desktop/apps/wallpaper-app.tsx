'use client';

// "Change Background…": a preview of the desktop and a dropdown of wallpapers.
// Picking one applies it straight away.

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AppWindow } from '../app-window';
import { useDesktop } from '../desktop-context';
import { WALLPAPERS, isWallpaperId, wallpaperById, type Wallpaper } from '../wallpapers';

// Plain colours are hex values; everything else is a gradient.
const isPlain = (w: Wallpaper) => w.background.startsWith('#');
const GROUPS = [
  { label: 'Gradients', items: WALLPAPERS.filter((w) => !isPlain(w)) },
  { label: 'Colours', items: WALLPAPERS.filter(isPlain) },
];

function Swatch({ background }: { background: string }) {
  return (
    <span
      aria-hidden="true"
      className="inline-block size-4 shrink-0 rounded-full border border-foreground/25"
      style={{ background }}
    />
  );
}

// A miniature of the desktop: menu bar, a window and the Dock.
function DesktopPreview({ background }: { background: string }) {
  return (
    <div
      aria-hidden="true"
      className="relative aspect-[16/10] w-full overflow-hidden rounded-lg border border-palette-lagoon/40 shadow-inner transition-[background] duration-500"
      style={{ background }}
    >
      <div className="absolute inset-x-0 top-0 flex h-[7%] items-center justify-end bg-palette-ink/45 px-[3%] backdrop-blur-sm">
        <span className="h-[35%] w-[14%] rounded-full bg-palette-cream/70" />
      </div>
      <div className="absolute left-[16%] top-[17%] h-[52%] w-[58%] overflow-hidden rounded-[6px] border border-palette-lagoon/40 bg-background shadow-lg">
        <div className="flex h-[16%] items-center gap-[3px] bg-palette-ink/90 px-[4%]">
          <span className="size-[5px] rounded-full bg-[#ff5f57]" />
          <span className="size-[5px] rounded-full bg-[#febc2e]" />
          <span className="size-[5px] rounded-full bg-[#28c840]" />
        </div>
        <div className="space-y-[6%] p-[6%]">
          <div className="h-[9px] w-1/2 rounded-sm bg-foreground/70" />
          <div className="h-[5px] w-3/4 rounded-sm bg-foreground/25" />
          <div className="h-[5px] w-2/3 rounded-sm bg-foreground/25" />
        </div>
      </div>
      <div className="absolute bottom-[4%] left-1/2 flex h-[10%] -translate-x-1/2 items-center gap-[4px] rounded-full border border-palette-lagoon/60 bg-palette-lagoon/30 px-[6px] backdrop-blur-sm">
        {Array.from({ length: 6 }, (_, i) => (
          <span key={i} className="aspect-square h-[62%] rounded-full bg-background/70" />
        ))}
      </div>
    </div>
  );
}

export function WallpaperApp() {
  const { wallpaper, setWallpaper } = useDesktop();
  const current = wallpaperById(wallpaper);

  return (
    <AppWindow id="wallpaper" title="Wallpaper" width={400}>
      <div className="space-y-4 px-4 pb-4 pt-1">
        <DesktopPreview background={current.background} />

        <div className="flex items-center justify-between gap-4">
          <label htmlFor="wallpaper-select" className="text-[13px] font-medium text-foreground/85">
            Background
          </label>
          <Select value={wallpaper} onValueChange={(v) => isWallpaperId(v) && setWallpaper(v)}>
            <SelectTrigger id="wallpaper-select" className="h-8 w-[190px] text-[13px] focus:ring-offset-0">
              <SelectValue>
                <span className="flex items-center gap-2">
                  <Swatch background={current.background} />
                  {current.name}
                </span>
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {GROUPS.map((group, i) => (
                <SelectGroup key={group.label}>
                  {i > 0 && <SelectSeparator />}
                  <SelectLabel className="text-xs text-muted-foreground">{group.label}</SelectLabel>
                  {group.items.map((w) => (
                    <SelectItem key={w.id} value={w.id} className="text-[13px]">
                      <span className="flex items-center gap-2">
                        <Swatch background={w.background} />
                        {w.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectGroup>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </AppWindow>
  );
}
