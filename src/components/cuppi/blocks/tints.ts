import type { FeatureTint } from '@/lib/features-types';

// How each brand tint looks when used as a surface. One table, so a block never
// hard-codes a colour and the whole site can be re-tuned from the palette in
// globals.css. `dark` surfaces flip their text to cream.
export const TINTS: Record<
  FeatureTint,
  { surface: string; chip: string; shape: string; dark: boolean; text: string; muted: string }
> = {
  honey: {
    surface: 'bg-cuppi-honey-soft',
    chip: 'bg-cuppi-honey text-cuppi-ink',
    shape: 'bg-cuppi-honey/45',
    dark: false,
    text: 'text-cuppi-ink',
    muted: 'text-cuppi-ink-soft',
  },
  sky: {
    surface: 'bg-cuppi-sky-soft',
    chip: 'bg-cuppi-sky text-cuppi-ink',
    shape: 'bg-cuppi-sky/45',
    dark: false,
    text: 'text-cuppi-ink',
    muted: 'text-cuppi-ink-soft',
  },
  moss: {
    surface: 'bg-cuppi-moss-soft',
    chip: 'bg-cuppi-moss-deep text-cuppi-paper',
    shape: 'bg-cuppi-moss/30',
    dark: false,
    text: 'text-cuppi-ink',
    muted: 'text-cuppi-ink-soft',
  },
  clay: {
    surface: 'bg-cuppi-clay-soft',
    chip: 'bg-cuppi-brand-deep text-cuppi-paper',
    shape: 'bg-cuppi-brand/25',
    dark: false,
    text: 'text-cuppi-ink',
    muted: 'text-cuppi-ink-soft',
  },
  lake: {
    surface: 'bg-cuppi-lake',
    chip: 'bg-cuppi-lake text-cuppi-paper',
    shape: 'bg-cuppi-sky/20',
    dark: true,
    text: 'text-cuppi-paper',
    muted: 'text-cuppi-paper/75',
  },
};

/** Cards in a row take their colours in turn, so a row is never one flat tone. */
export const TINT_CYCLE: FeatureTint[] = ['honey', 'sky', 'clay', 'moss'];
