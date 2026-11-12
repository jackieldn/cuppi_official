# Cuppi brand, v0 (experimental)

A working draft, built on the `cuppi-site-redesign` branch. It is meant to be
argued with. Everything here lives in one place in code: the `.theme-cuppi` block in
`src/app/globals.css` (values) and the `cuppi` colours in `tailwind.config.ts`
(names). Change a value there and the whole site follows.

## The feeling

The calm of a farm at seven in the morning. Warm paper, not white. Espresso, not
black. Colours that come from a meadow, with Cuppi's orange kept for the one thing
worth clicking. Soft, rounded, unhurried. Informative without being busy.

It is the opposite of a tech product page: no gradients, no glow, no neon, no
generic "AI orange". Orange is a brand colour here, used with intent.

## Colour

Source: the "Golden Meadow" palette, plus the app's own `AccentColor`
(light `#D65A1F`, dark `#FF6B00`).

| Token | Hex | Use |
| --- | --- | --- |
| `paper` | `#FBF4E6` | Page background. Never pure white. |
| `paper-deep` | `#F4E8D0` | Footer, sunken wells |
| `card` | `#FFFAF0` | Raised surfaces: menu, cards |
| `ink` | `#2B2118` | Text. Never pure black. |
| `ink-soft` | `#6B5A4A` | Secondary text |
| `line` | `#E6D7BC` | Hairlines and borders |
| `brand` | `#D65A1F` | AccentColor (light). **Large display type only.** |
| `brand-deep` | `#B8461A` | Buttons and links. The accessible orange. |
| `brand-bright` | `#FF6B00` | AccentColor (dark). Reserved for dark surfaces and glows. |
| `lake` | `#2E5A7C` | Trust, security, the closing call to action |
| `sky` | `#7FB1D1` | Calm blue accents |
| `moss` / `moss-deep` | `#6B8449` / `#4E6233` | Growth, money. Use `moss-deep` behind text. |
| `honey` | `#F2A53B` | Celebration, warmth, the secondary button |
| `*-soft` tints | see globals.css | Colour-block card backgrounds (sky, moss, honey, clay) |

Rules:

- One loud thing per screen. That thing is `brand-deep`.
- Each feature wears one tint (honey, sky, moss, clay or lake). Cards in a row take
  their tints in turn so a row is never one flat tone.
- Orange `brand` on paper is 3.6:1, so it is for headline-size type only. Anything
  small uses `brand-deep` (4.9:1 on paper, 5.1:1 under cream text).
- Body text pairs all clear WCAG AA (6.0 to 14.4:1).

## Type

- **Display: Fraunces** (soft axis at 100). A warm, slightly wobbly serif. It sits
  close to the display serif the app itself uses for household names.
- **Body: DM Sans.** Friendly and legible, no personality fighting the serif.
- Italic Fraunces is for a single emphasised word ("*gently*") or a callout sentence.

## Shape

Big radii: 2rem to 2.5rem on blocks, fully round pills for buttons and the menu.
Nothing is sharp. Soft arches and circles drift in the corners of colour blocks.

## Motion

Three ideas, defined once in `globals.css`, so everything moves the same way:

- **Rise**: things grow up into place, with a tiny overshoot (`--ease-spring`).
  Phones rise out of the bottom of their card.
- **Bob**: ambient shapes drift slowly. The page feels alive but never busy.
- **Pop**: menus and panels unfold from where they were opened.

Plus: the menu highlight glides between links; icons tilt a few degrees on hover.
Everything switches off under `prefers-reduced-motion`.

## Building a feature page

A feature page is a hero plus a list of blocks (`src/lib/features-types.ts`). The
blocks are reusable layouts in `src/components/cuppi/blocks`:

| Block | What it is |
| --- | --- |
| `showcase` | Text on one side, a phone rising out of a colour card on the other |
| `cards` | A swipeable row of phone cards |
| `callout` | One big warm sentence on a colour band |
| `points` | Short reasons, no images |

To add a layout: write the component, add its type to `FeatureBlock`, add a case to
`block-renderer.tsx`. Images are either `phone` (a transparent phone crop that rises
from the bottom edge) or `photo` (full-bleed).

Until the admin exists, features come from `src/lib/features-seed.ts`. Chores, Car,
Shopping, Celebrations, Siri and the Companion have no website copy or screenshots
yet and are deliberately absent rather than invented.
