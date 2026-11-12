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
| `brand` | `#D65A1F` | AccentColor (light). The Download button. Too light for small text on cream (3.6:1). |
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

- **Display: DM Serif Display**, Regular and Italic: the app's own display serif. It
  has no bold, so titles are never bolded (the theme sets `font-synthesis: none`).
- **Body: DM Sans.** Friendly and legible, no personality fighting the serif.
- Italic is for a single emphasised word ("*gently*") or a callout sentence.

## Shape

Big radii: 2rem to 2.5rem on blocks, fully round pills for buttons and the menu.
Nothing is sharp. Colour blocks are flat: no decorative shapes, and no shadows on the menu or the app tiles.

## Motion

Two ideas, defined once in `globals.css`, so everything moves the same way:

- **Rise**: things grow up into place, with a tiny overshoot (`--ease-spring`).
  Phones rise out of the bottom of their card.
- **Pop**: menus and panels unfold from where they were opened.

Plus: the menu highlight glides between links, and menu tiles grow slightly on hover.
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

Until the admin exists, features come from `src/lib/features-seed.ts`.

## Features and their icons

Features are grouped as the app's Apps tab groups them: **Family life**
(Celebrations, Pets, Chores) and **Home** (Shopping, Budget, Bin Day, Receipts, Car)
fill the Features menu. **Your Home** (Home Feed, Personalisation, Privacy & Security)
is the second menu.

Each feature wears its in-app icon as an *app tile* (`AppTile` in
`src/components/cuppi/feature-icon.tsx`), built the way the app's icons are built:
a **flat fill**, a **1px outline** in a deeper shade of the same hue, and a thin
**shine** (about 1% of the tile's height) in a lighter, more saturated tint at the top
and bottom, curving up into the corners. No gradient dominates and there are no
shadows. The four colours (pink, green, blue, amber) were sampled from the app's own
icons; each is a fill, an edge tint, a shine and an outline value. The 3D glyph from
`public/icons` sits centred on it. A feature without an in-app glyph gets a white line
icon on the same tile.

Menus show the icon and the name only. Descriptions live on the pages, not in menus.

Chores, Shopping and Car are in the app but have no website copy or screenshots yet,
so they appear as "Soon" and have no page. Siri and the Companion are not listed yet.
Nothing is invented for any of them.

## The home page hero

The home page leads with whatever is newest: the latest release, a seasonal promo, a
discount. It is one small piece of data in `src/lib/home-hero.ts` (badge, headline,
text, one quiet link, a screenshot, which phone, a tint). Change it and nothing else
needs touching. Wrap a word in `*asterisks*` in the headline to set it in italic.

There is no Download button in any hero. It lives in the menu, top right, and the
closing strip at the bottom of the feature pages.

## Phone mockups

`PhoneMockup` (`src/components/cuppi/blocks/phone-mockup.tsx`) puts a plain app
screenshot inside the iPhone renders in `public/phone-frames`: `front` (straight on)
or `tilt` (turned 45 degrees). The screenshot sits behind the transparent frame and,
for the tilted one, is warped onto the screen's perspective, so it follows the phone.
`flip` mirrors the phone (the screenshot is never mirrored). The measured screen
corners and the maths are in `src/lib/phone-mockups.ts`, with tests.

To add another mockup render: put the transparent PNG in `public/phone-frames`, measure
its four screen corners, and add an entry to `MOCKUPS`.

Screenshots: the hero shows the top part of the screen, so crop the file before adding
it (the tab bar shows your profile photo, and the car's plate is readable). Pass the
app's background colour as `bg` to fill any part of the screen the screenshot does not
cover.
