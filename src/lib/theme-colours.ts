// The Cuppi site's base colours, editable in the admin (Cuppi > Colours).
//
// globals.css holds the designed palette as CSS variables: `--c-paper`, `--c-card` and so on, as space-separated RGB
// channels, in `.theme-cuppi` (light) and `html[data-theme='dark'] .theme-cuppi` (dark). This file lists those colours
// with their defaults, and turns the admin's changes into a small stylesheet that sits on top of them.
//
// What is stored (one document, cuppi_home/colours) is only what the admin changed:
//   { enabled, light: { paper: '#fbf4e6', ... }, dark: { ... } }
// A colour that is not there, or that equals its default, is left as designed. `enabled` is the safety switch: with it
// off the site uses the designed palette whatever is saved, so colours can be tried out in the admin first.
//
// Everything stored goes through resolveColours, which keeps only known colours written as #rrggbb, so a bad document
// can never put anything but a colour into the page's CSS. The defaults below are checked against globals.css by a
// unit test, so the two cannot drift apart. No imports from the app, so the unit tests can load it from Node.

export type Mode = 'light' | 'dark';

export type ColourGroup = 'surfaces' | 'text' | 'brand' | 'blocks' | 'tints' | 'fixed';

export const COLOUR_GROUPS: { key: ColourGroup; title: string; blurb: string }[] = [
  { key: 'surfaces', title: 'Backgrounds and borders', blurb: 'The page, the boxes on it, and the lines between them.' },
  { key: 'text', title: 'Text', blurb: 'Headlines and body, and the quieter text.' },
  { key: 'brand', title: 'Cuppi orange', blurb: 'Buttons, links and highlights.' },
  { key: 'blocks', title: 'Colour blocks', blurb: 'The strong colours behind cards and feature sections.' },
  { key: 'tints', title: 'Soft tints', blurb: 'Pale versions of the block colours, for quieter cards.' },
  { key: 'fixed', title: 'Fixed colours', blurb: 'Used where a colour must look the same in light and dark: text on a strong colour, and shadows.' },
];

export type ColourDef = {
  /** The CSS variable is `--c-{key}`; Tailwind calls it `cuppi-{key}`. */
  key: string;
  label: string;
  /** Where you will see it. */
  hint: string;
  group: ColourGroup;
  /** The designed colour in each theme, as the space-separated RGB channels globals.css uses. */
  light: string;
  dark: string;
};

// A colour that is the same in both themes passes one value. Keep these in step with globals.css (a test checks).
const c = (key: string, label: string, hint: string, group: ColourGroup, light: string, dark: string = light): ColourDef => ({ key, label, hint, group, light, dark });

export const COLOURS: ColourDef[] = [
  c('paper', 'Page background', 'Behind everything', 'surfaces', '251 244 230', '36 24 18'),
  c('card', 'Raised boxes', 'The menu, cards and panels that sit on the page', 'surfaces', '255 250 240', '52 36 26'),
  c('paper-deep', 'Sunken areas', 'The footer and wells', 'surfaces', '244 232 208', '27 18 12'),
  c('line', 'Borders', 'Hairlines round the menu and cards', 'surfaces', '230 215 188', '76 54 38'),

  c('ink', 'Main text', 'Headlines and body text', 'text', '43 33 24', '245 236 222'),
  c('ink-soft', 'Quiet text', 'Descriptions and small print', 'text', '107 90 74', '192 180 165'),

  c('brand', 'Orange', 'Italic highlights in headlines', 'brand', '214 90 31', '255 107 0'),
  c('brand-deep', 'Orange for text', 'Links and orange text. Needs to read well on the page', 'brand', '184 70 26', '255 140 74'),
  c('brand-bright', 'Orange glow', 'Glows and bright highlights', 'brand', '255 107 0', '255 138 61'),

  c('lake', 'Lake blue', 'Deep blue sections: trust and security', 'blocks', '46 90 124', '41 80 111'),
  c('sky', 'Sky blue', 'Calm blue accents', 'blocks', '127 177 209'),
  c('moss', 'Moss green', 'Growth and money', 'blocks', '107 132 73'),
  c('moss-deep', 'Deep moss', 'Green behind light text', 'blocks', '78 98 51'),
  c('honey', 'Honey gold', 'Celebration', 'blocks', '242 165 59'),

  c('honey-soft', 'Honey tint', 'Pale gold cards and the menu highlight', 'tints', '252 230 190', '60 48 32'),
  c('sky-soft', 'Sky tint', 'Pale blue cards', 'tints', '211 230 241', '32 46 57'),
  c('moss-soft', 'Moss tint', 'Pale green cards', 'tints', '220 229 200', '41 49 35'),
  c('clay-soft', 'Clay tint', 'Pale orange cards', 'tints', '246 211 191', '64 41 33'),

  c('cream', 'Light text on colour', 'Text on lake, moss and orange', 'fixed', '251 244 230'),
  c('espresso', 'Dark text on colour', 'Text on honey and sky', 'fixed', '43 33 24'),
  c('brand-fill', 'Orange button', 'The orange behind cream text', 'fixed', '184 70 26'),
  c('shadow', 'Shadows', 'The tone shadows are cast in', 'fixed', '43 33 24', '0 0 0'),
  c('selection', 'Highlighted text', 'The orange behind text you select', 'fixed', '255 107 0'),
];

export const COLOUR_KEYS: string[] = COLOURS.map((d) => d.key);
const DEF = new Map(COLOURS.map((d) => [d.key, d]));

// ---------------------------------------------------------------------------
// Colour arithmetic
// ---------------------------------------------------------------------------

const HEX = /^#[0-9a-f]{6}$/;

/** A colour typed or picked by the admin -> "#rrggbb" in lower case, or null if it is not one ("#abc" is accepted too). */
export function normaliseHex(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  let v = value.trim().toLowerCase();
  if (/^#[0-9a-f]{3}$/.test(v)) v = `#${v[1]}${v[1]}${v[2]}${v[2]}${v[3]}${v[3]}`;
  return HEX.test(v) ? v : null;
}

const parseChannels = (channels: string): [number, number, number] => channels.split(' ').map(Number) as [number, number, number];
export const channelsToHex = (channels: string): string => '#' + parseChannels(channels).map((n) => n.toString(16).padStart(2, '0')).join('');
export const hexToChannels = (hex: string): string => `${parseInt(hex.slice(1, 3), 16)} ${parseInt(hex.slice(3, 5), 16)} ${parseInt(hex.slice(5, 7), 16)}`;

/** "#rrggbb" -> the "H S% L%" the shadcn variables (--background, --primary...) use. */
export function hexToHsl(hex: string): string {
  const [r, g, b] = parseChannels(hexToChannels(hex)).map((n) => n / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  let h = 0;
  let s = 0;
  if (d > 0) {
    s = d / (1 - Math.abs(2 * l - 1));
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  const round = (n: number) => Math.round(n * 10) / 10;
  return `${round(h)} ${round(s * 100)}% ${round(l * 100)}%`;
}

/** WCAG contrast ratio between two colours, 1 (none) to 21 (black on white). */
export function contrast(a: string, b: string): number {
  const lum = (hex: string) => {
    const [r, g, bl] = parseChannels(hexToChannels(hex)).map((n) => {
      const v = n / 255;
      return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

// ---------------------------------------------------------------------------
// Defaults and what is stored
// ---------------------------------------------------------------------------

/** The designed colour for one key in one theme, as "#rrggbb". */
export const defaultHex = (key: string, mode: Mode): string => channelsToHex(DEF.get(key)![mode]);

/** The designed colours for a whole theme. */
export function defaultColours(mode: Mode): Record<string, string> {
  return Object.fromEntries(COLOURS.map((d) => [d.key, channelsToHex(d[mode])]));
}

export type ColourOverrides = Record<string, string>;
export type ColourSettings = { enabled: boolean; light: ColourOverrides; dark: ColourOverrides };

export const emptyColourSettings = (): ColourSettings => ({ enabled: false, light: {}, dark: {} });

function readOverrides(raw: unknown, mode: Mode): ColourOverrides {
  const out: ColourOverrides = {};
  if (!raw || typeof raw !== 'object') return out;
  for (const key of COLOUR_KEYS) {
    const hex = normaliseHex((raw as Record<string, unknown>)[key]);
    if (hex && hex !== defaultHex(key, mode)) out[key] = hex;
  }
  return out;
}

/** The stored document -> settings that are safe to use. Unknown colours, bad values and values equal to the default are dropped. */
export function resolveColours(stored: unknown): ColourSettings {
  const s = stored && typeof stored === 'object' ? (stored as Record<string, unknown>) : {};
  return { enabled: s.enabled === true, light: readOverrides(s.light, 'light'), dark: readOverrides(s.dark, 'dark') };
}

/** Every colour in a theme once the changes are applied on top of the designed ones. */
export const colourValues = (overrides: ColourOverrides, mode: Mode): Record<string, string> => ({ ...defaultColours(mode), ...overrides });

export const countChanges = (s: ColourSettings): number => Object.keys(s.light).length + Object.keys(s.dark).length;

// ---------------------------------------------------------------------------
// The stylesheet
// ---------------------------------------------------------------------------

// Pages written with the shadcn names (bg-background, text-primary, border...) read these HSL variables, which globals.css
// points at the same designed colours. When one of those colours changes, they follow it. Only pairs that mean the same
// colour in both themes are listed.
const FOLLOWERS: Record<string, string[]> = {
  paper: ['--background'],
  card: ['--card', '--popover'],
  ink: ['--foreground', '--card-foreground', '--popover-foreground'],
  'ink-soft': ['--muted-foreground'],
  line: ['--border', '--input'],
  'brand-deep': ['--primary'],
  honey: ['--accent'],
};

/** The CSS variables for one theme's changes: `--c-paper: 251 244 230;` and the shadcn ones that follow. */
export function declarations(overrides: ColourOverrides): string {
  const out: string[] = [];
  for (const key of COLOUR_KEYS) {
    const hex = overrides[key];
    if (!hex || !HEX.test(hex)) continue;
    out.push(`--c-${key}:${hexToChannels(hex)}`);
    for (const name of FOLLOWERS[key] ?? []) out.push(`${name}:${hexToHsl(hex)}`);
  }
  return out.join(';');
}

/**
 * The stylesheet that applies the changes, or '' when there is nothing to apply (switched off, or nothing changed).
 * The selectors are a notch more specific than globals.css's, so they win; the dark one is more specific again, so a
 * dark change wins in the dark theme and a light change never reaches it.
 *
 * That last part needs care. globals.css writes the dark theme as "the light colours, with these ones replaced", so a
 * colour it does not replace (honey, say) is inherited from light, and a change to it in light would show in dark too.
 * Those colours are pinned back to their designed dark value in the dark rule, unless dark has a change of its own.
 */
export function buildColourCss(s: ColourSettings): string {
  if (!s.enabled) return '';
  const light = declarations(s.light);
  const pinned = Object.keys(s.light)
    .filter((key) => DEF.has(key) && !s.dark[key] && DEF.get(key)!.dark === DEF.get(key)!.light)
    .map((key) => `--c-${key}:${DEF.get(key)!.dark}`);
  const dark = [declarations(s.dark), ...pinned].filter(Boolean).join(';');
  return [light && `html .theme-cuppi{${light}}`, dark && `html[data-theme='dark'] .theme-cuppi{${dark}}`].filter(Boolean).join('\n');
}

/** The page colour in each theme, for the browser's own address bar. */
export const browserChrome = (s: ColourSettings): Record<Mode, string> => ({
  light: s.enabled && s.light.paper ? s.light.paper : defaultHex('paper', 'light'),
  dark: s.enabled && s.dark.paper ? s.dark.paper : defaultHex('paper', 'dark'),
});

/** Inline CSS variables that give an element one whole theme, for the admin's previews (which cannot use the page's theme switch). */
export function previewVariables(overrides: ColourOverrides, mode: Mode): Record<string, string> {
  const vars: Record<string, string> = {};
  const all = colourValues(overrides, mode);
  for (const key of COLOUR_KEYS) {
    vars[`--c-${key}`] = hexToChannels(all[key]);
    for (const name of FOLLOWERS[key] ?? []) vars[name] = hexToHsl(all[key]);
  }
  return vars;
}

// ---------------------------------------------------------------------------
// Readability
// ---------------------------------------------------------------------------

export type Pairing = { label: string; text: string; on: string; /** The ratio WCAG AA asks for: 4.5 for text, 3 for large text and graphics. */ need: number };

/** The text-on-background pairs the site relies on. The admin checks each as colours change. */
export const PAIRINGS: Pairing[] = [
  { label: 'Main text on the page', text: 'ink', on: 'paper', need: 4.5 },
  { label: 'Main text on boxes', text: 'ink', on: 'card', need: 4.5 },
  { label: 'Quiet text on the page', text: 'ink-soft', on: 'paper', need: 4.5 },
  { label: 'Quiet text on boxes', text: 'ink-soft', on: 'card', need: 4.5 },
  { label: 'Orange links on the page', text: 'brand-deep', on: 'paper', need: 4.5 },
  { label: 'Orange links on boxes', text: 'brand-deep', on: 'card', need: 4.5 },
  { label: 'Text on the orange button', text: 'cream', on: 'brand-fill', need: 4.5 },
  { label: 'Text on honey', text: 'espresso', on: 'honey', need: 4.5 },
  { label: 'Text on sky', text: 'espresso', on: 'sky', need: 4.5 },
  { label: 'Text on lake', text: 'cream', on: 'lake', need: 4.5 },
  { label: 'Text on deep moss', text: 'cream', on: 'moss-deep', need: 4.5 },
  { label: 'Main text on honey tint', text: 'ink', on: 'honey-soft', need: 4.5 },
  { label: 'Main text on sky tint', text: 'ink', on: 'sky-soft', need: 4.5 },
  { label: 'Main text on moss tint', text: 'ink', on: 'moss-soft', need: 4.5 },
  { label: 'Main text on clay tint', text: 'ink', on: 'clay-soft', need: 4.5 },
];

export type PairingResult = Pairing & { ratio: number; ok: boolean };

export function checkPairings(overrides: ColourOverrides, mode: Mode): PairingResult[] {
  const all = colourValues(overrides, mode);
  return PAIRINGS.map((p) => {
    const ratio = contrast(all[p.text], all[p.on]);
    return { ...p, ratio, ok: ratio >= p.need };
  });
}
