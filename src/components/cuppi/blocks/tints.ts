import type { FeatureTint } from '@/lib/features-types';

// How each brand tint looks when used as a surface. One table, so a block never
// hard-codes a colour and the whole site can be re-tuned from the palette in
// globals.css. `dark` surfaces flip their text to cream. Chips and the lake surface use the
// fixed cream/espresso/brand-fill tokens, not paper/ink, because they must look the same in
// light and dark: a strong colour needs the same text on it whichever theme the page is in.
export const TINTS: Record<
  FeatureTint,
  { surface: string; chip: string; dark: boolean; text: string; muted: string }
> = {
  honey: {
    surface: 'bg-cuppi-honey-soft',
    chip: 'bg-cuppi-honey text-cuppi-espresso',
    dark: false,
    text: 'text-cuppi-ink',
    muted: 'text-cuppi-ink-soft',
  },
  sky: {
    surface: 'bg-cuppi-sky-soft',
    chip: 'bg-cuppi-sky text-cuppi-espresso',
    dark: false,
    text: 'text-cuppi-ink',
    muted: 'text-cuppi-ink-soft',
  },
  moss: {
    surface: 'bg-cuppi-moss-soft',
    chip: 'bg-cuppi-moss-deep text-cuppi-cream',
    dark: false,
    text: 'text-cuppi-ink',
    muted: 'text-cuppi-ink-soft',
  },
  clay: {
    surface: 'bg-cuppi-clay-soft',
    chip: 'bg-cuppi-brand-fill text-cuppi-cream',
    dark: false,
    text: 'text-cuppi-ink',
    muted: 'text-cuppi-ink-soft',
  },
  lake: {
    surface: 'bg-cuppi-lake',
    chip: 'bg-cuppi-lake text-cuppi-cream',
    dark: true,
    text: 'text-cuppi-cream',
    muted: 'text-cuppi-cream/75',
  },
};

/** Cards in a row take their colours in turn, so a row is never one flat tone. */
export const TINT_CYCLE: FeatureTint[] = ['honey', 'sky', 'clay', 'moss'];
