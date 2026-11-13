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
- **Highlighted text** (selected with the cursor) is the brand orange, not the operating system's blue or
  grey: pure `#FF6B00` (`--c-selection`, the same in both themes; light mode's `--c-brand` goes salmon-pink when
  tinted) laid over whatever is behind it at 35% in light and 45% in dark (`--selection-alpha`; the
  `::selection` rule in `globals.css`). It is a tint, so text keeps its own colour and it works on every
  surface. Orange text (`text-cuppi-brand`, `text-cuppi-brand-deep`) turns to the ink colour while selected,
  because orange on an orange tint would vanish.

## Dark mode

The same farmhouse, lamp on, after dark. Warm espresso (hue 20, 35% saturation), never
black or grey; it turns 70s brown if it drifts yellower (hue 27 and up); cream type; and the app's own
dark AccentColor. Visitors choose **Light, Auto
or Dark** with the toggle in the footer. Auto (the default) follows the device and
changes live if the device does; the choice is remembered in `localStorage`
(`cuppi-theme`). Logic is in `src/lib/theme.ts`, the control in
`src/components/cuppi/theme-toggle.tsx`.

How it works: a tiny script at the top of `<head>` sets `data-theme="dark"` (and the
`dark` class) on `<html>` before the page paints, so there is never a flash of the
wrong palette. The dark values live in the `html[data-theme='dark'] .theme-cuppi`
block in `globals.css`. It only re-points the same `--c-*` variables, so nothing
else knows which theme it is in.

| Token | Light | Dark | Note |
| --- | --- | --- | --- |
| `paper` | `#FBF4E6` | `#241812` | Page. Warm espresso, 35% saturation. |
| `paper-deep` | `#F4E8D0` | `#1B120C` | Sunken (footer): still darker than the page. |
| `card` | `#FFFAF0` | `#34241A` | Raised: still lighter than the page. |
| `ink` | `#2B2118` | `#F5ECDE` | Warm cream, never pure white. |
| `ink-soft` | `#6B5A4A` | `#C0B4A5` | |
| `line` | `#E6D7BC` | `#4C3626` | |
| `brand` | `#D65A1F` | `#FF6B00` | The app's dark AccentColor. Headline-size type and glows. |
| `brand-deep` | `#B8461A` | `#FF8C4A` | Orange **text and links**. Flips lighter so it reads on dark. |
| `lake` | `#2E5A7C` | `#29506F` | A touch deeper, so it rests rather than glares. |
| `*-soft` tints | pastels | deep, muted | Each keeps its hue: `#202E39` sky, `#293123` moss, `#3C3020` honey, `#402921` clay. |

Rules:

- **`paper` and `ink` flip, so never use them as "the light colour on a strong
  surface".** Cream text on lake, moss or orange uses `text-cuppi-cream`; dark text on
  honey or sky uses `text-cuppi-espresso`; orange behind cream text is
  `bg-cuppi-brand-fill` (not `brand-deep`, which is a text colour that goes light in
  dark). These three are fixed in both themes.
- Shadows are cast with `rgb(var(--c-shadow) / 0.2)`, not a literal brown, so they
  deepen to black in dark.
- The background patterns are white shapes, which glare on a dark surface. In dark,
  `--pattern-strength` takes them to a quarter of their light-mode opacity, and
  `--pattern-blend: overlay` mixes them with the block they sit on, so each pattern
  picks up its own block's colour (amber on honey, blue on sky) instead of grey-white.
  Light keeps plain white (`normal`).
- Artwork with a dark mark on a transparent background needs `dark:invert` (the
  footer's social icons do). Phone screenshots and the app icons are left alone.
- Every text pair in dark clears WCAG AA: body 6.3 to 15.8:1, orange text 5.6 to 8.0:1
  (lowest: `brand-deep` on the honey tint), cream on lake 7.8:1.

## The logo

The orange house with its smile, drawn as an SVG (November 2026). `public/icons/CuppiHome-logo-nov2026.svg`
is the editable original (3.7MB, nearly all of it Illustrator's metadata); the site uses
`CuppiHome-logo-nov2026.min.svg` (1.5KB, same artwork), referenced through `CUPPI_LOGO` in
`src/lib/brand-assets.ts`. It has no background: bare in the header and footer, and on the cream tile
(`CuppiTile`) wherever it appears as an app icon (the icon fan, the "little refresh" pages). The social
share image and structured data still point at the old PNG, because social networks do not accept SVG.
If you edit the original, re-export the slim copy.

**The name slides out.** In the header and footer the logo and "Cuppi Home" are one link
(`CuppiLogoLink`, `src/components/cuppi/logo-link.tsx`; the styles are the `.cuppi-logo` block in
`globals.css`). On a device with a mouse the name is tucked away behind the logo. Hover the logo (or tab to
it) and the name slowly slides out from behind it (about 1.6s), uncovered by a soft wipe, starting in
Cuppi orange and settling to the text colour. **It then stays out** for the rest of the visit, including when
moving between pages (a small module-level memory, per logo). Notes:

- The name's space is always reserved, so nothing around it moves when it appears.
- Only the logo itself starts it, not the empty space where the name will be.
- Touch screens have no hover, so there the name is simply always shown. Reduced motion gets the same
  reveal instantly.
- The motion is CSS; the script only remembers that the logo has been hovered. `--reach` (set per logo from
  its width) is how far behind the logo the name starts.

## Images and caching

Pictures should be fetched once and then come from the browser's own cache, so icons never blink or reload.
What makes that true (all in `next.config.ts` unless noted):

- **`/public` folders are cached for a week** (`icons`, `patterns`, `phone-frames`, `images`, `brand`), then
  refreshed quietly in the background for a month. Next sends `/public` files with `max-age=0` by default,
  which makes the browser ask the server about every picture on every use. **If you replace one of these files,
  give it a new name**, or visitors keep the old one for up to a week.
- **Resized pictures (`next/image`) are kept for a week** (`images.minimumCacheTTL`; the default is 60 seconds).
  Firebase Storage files carry no cache headers of their own (they are sent as `private, max-age=0`), so going
  through `next/image` is what makes them cacheable. A changed picture should get a new address (a Firebase
  upload gets a new token).
- **Anything that matters is self-hosted.** The App Store badge and social icons used to load straight from
  Firebase on every page view (about 600ms each); they now live in `public/brand`.
- **Tiles that appear with an animation or a click load early.** The icon fan and the menu panels use
  `<AppTile eager>` so the pictures are already there when the tile shows, instead of a blank tile that pops in
  as a lazy image arrives. The menu panels only exist while open, so the header also loads their tiles quietly,
  out of sight, on arrival. The header logo is `priority`.
- `next dev` always sends resized pictures with `max-age=0` (so you can edit them), so caching only shows up in
  a production build.

## Type

- **Display: DM Serif Display**, Regular and Italic: the app's own display serif. It
  has no bold, so titles are never bolded (the theme sets `font-synthesis: none`).
- **Body: DM Sans.** Friendly and legible, no personality fighting the serif.
- Highlighted text is set in the AccentColor (`text-cuppi-brand`), italic: one word or short phrase per
  headline ("Vroom-vroom", "as you do.", "gently", "help?"). Always large display type, because the
  orange is too light for small text on cream. Small orange text uses `brand-deep`.
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

The Features menu has three columns: **Family life** (Celebrations, Pets, Chores),
**Home** (Shopping, Bin Day, Car) and **Finance** (Budget, Receipts). **Your Home** (Home
Feed, Personalisation, Privacy & Security) is the second menu, and stays separate.

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
discount. It is one small piece of data in `src/lib/home-hero.ts` (headline,
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

## Help pages

`/faq` (the help centre), each topic page (`/faq/<topic>`), search results and `/support`
share one look. Inner pages open with `PageHero` (`src/components/cuppi/page-hero.tsx`):
a tinted colour block with a "back" pill (pinned to the block's top-left corner, 1.5rem from the top and from the left, 1.25rem on a phone; the feature hero's "All features" pill sits in the same place), an optional app tile beside the title, a line
of text and a search box or button. The help front page has its own centred version.

- The search box is a large pill with an orange focus ring; results open in a bordered
  card (no shadow).
- Each help topic wears a tile and a tint (`src/lib/faq-visuals.ts`): the feature topics
  reuse the in-app icons, the general ones a line icon on a coloured tile. A new topic
  added in Sanity gets a default tile automatically.
- Topic cards show only a tile, a name and one line. Counts, dates and question lists live
  on the topic page.
- Server components only: `CuppiHeader` and `CuppiFooter` are async, so a page that imports
  them must not be a client component. Anything that needs the browser (the support form's
  pop-up) goes in a small client component, as `SupportMessage` does.

## The main action button

`ActionButton` (`src/components/cuppi/action-button.tsx`) is the one orange button: the menu's
Download, "Message us", the closing "Download on the App Store" and the invite page's
"Open in Cuppi". It is built like the app's icons: a flat AccentColor fill, a 1px deeper
outline, and a thin bright shine at the top and bottom that curves into the pill's ends.
It does not move: on hover a faint light rises from the bottom edge, and while pressed
the whole button lights up. Use it for the single main action on a page and nowhere else. Secondary buttons ("Explore
features", the "back" pills) stay plain on purpose. It renders a link (in the same tab, in a
new tab, or a plain link for app deep links) or a button, and works as a dialog trigger.

Cream text on the AccentColor is 3.8:1, below the usual 4.5:1 for small text, so the label
is always semibold and at least 15px.

## The menu bar

The logo's left edge sits where the bar's rounded end finishes (half the bar's height, so
about 30px in), not hard against the curve.

## Patterns

The app's background patterns are in `public/patterns` (autumnPorch, springGarden, summerTea,
victorianWinter). The originals are 0.6 to 1MB each because they carry Illustrator metadata and
hidden layers, so the site uses slimmed copies (`*.min.svg`: 30 to 280KB). Do not round their numbers to shrink them further: the shapes are built
from thousands of tiny relative moves, and rounding breaks the small details (springGarden's little flowers fill in). List and paths are in
`src/lib/patterns.ts`.

`PatternOverlay` (`src/components/cuppi/pattern-overlay.tsx`) lays a pattern over a colour block.
The shapes are white, so opacity sets how strongly it shows. The house look is a quiet patch
of 5% around what we want looked at, easing out to 30% at the corners, so a phone or a search
box sits in a calm area. `shape="ellipse"` stretches the fade to a wide block.

| Where | Pattern | Quiet patch |
| --- | --- | --- |
| Home hero | victorianWinter | behind the phone |
| Every feature page hero | victorianWinter | behind the phone |
| Cosy Corner hero | autumnPorch | behind the picture |
| Help page hero | summerTea | the middle, behind the search box (ellipse) |
| Support hero | springGarden | the middle, behind the icons and title (ellipse) |

**Cursor light.** The home hero's pattern also lights up under the pointer: a soft circle (190px)
where the pattern rises to 50%, easing after the cursor and fading in and out as it enters and
leaves (`SpotlightPattern`). It is on every hero with a pattern: the home hero's `spot` and `radius`
are in `src/lib/home-hero.ts`; the others use 50% (17% on the dark feature heroes). It is mouse and
pen only: touch screens and reduced-motion get the plain pattern. The opacity maths is in
`patternLayers()` in `src/lib/patterns.ts`, with tests. 

White reads much stronger on a dark colour than on a light one, so dark heroes (the deep
blue ones) get a third of the strength (1.5% to 10%). Pages that put a pattern behind text
must check the text still reads.

## The home hero's opening shot

When the home page loads, the hero shows only its colour block until everything it needs has
downloaded (fonts, the phone images, the pattern). Then the camera pulls back out of the hero.
It is built in layers at different depths. Parallax is the same move on the same timeline at
different distances: every layer shares one duration (4.4s) and one curve, and they differ only
in how far they travel, so the near layer is always moving faster and they arrive together.
(Give the layers different durations and they cross over, which flattens the depth. The first
version did that, and the parallax barely showed.)

| Layer | What | Starts | Speed vs the pattern |
| --- | --- | --- | --- |
| far (`.intro-far`) | the pattern | 8% closer | 1x |
| mid (`.intro-mid`) | the text | 30% closer | 4x |
| near (`.intro-near`) | the phone | 90% closer | 11x |
| late (`.intro-late`) | the button | fades up at about 2.6s, as the move settles | |

`HeroIntro` (`src/components/cuppi/home/hero-intro.tsx`) holds the hero in `prep`, waits, then sets
`play`; the timings are in `globals.css`. It cannot leave the hero hidden: it plays after 6 seconds
even if something never loads, and with no JavaScript CSS reveals it after 8. Reduced motion shows
no movement. To use it on another hero, wrap the frame in `HeroIntro` and put `intro-far`,
`intro-mid`, `intro-near` and `intro-late` on the layers.

## The icon fan

Below "What's new", the home page shows Cuppi's own icon on its own: the house logo on a cream (`#FFF3D7`) tile
built exactly like the feature tiles (`CuppiTile`, sharing `TileShell` with `AppTile` in `feature-icon.tsx`).
When it scrolls into view, the eight in-app icons (every feature in the Features menu, as `AppTile`s)
slide out of it to the left and right, the nearest first, and settle with a small overshoot
(`AppFan`, `src/components/cuppi/home/app-fan.tsx`; the layout is the `.fan` block in `globals.css`). It
plays once. Icons take turns going right then left, in menu order, so a feature added to the menu joins the
fan with no other change (the layout holds eight; a ninth needs a new slot).

On a wide screen it is one row of nine; on a phone, Cuppi with two icons either side and four more in a
second row below. Positions are written in "units" that scale down to fit the width, never up. Like the
hero intro, it cannot leave the icons hidden: without JavaScript they appear after 6 seconds, and with
reduced motion they are simply in place.

The support page uses it at the top of its hero, centred above the title (`PageHero` with
`align="center"`, `top` and `pattern`). There it opens once the page, fonts, icons and the hero's pattern
have all downloaded (`when="loaded"`, using the same `useAssetsReady` hook as the home hero's opening shot)
rather than on scroll.

## Editing the site from the admin

The admin (jackiepoot.co.uk/admin, signed in as an admin) has a "Cuppi website" section in its sidebar.

- **Cuppi menu** (`/admin/cuppi-menu`): the order, names, addresses and on/off switch of every link in the
  top menu, up to four extra links of your own, and the Download button (name, link, on/off). Saved as one
  document, `cuppi_menu/main`. "Features" and "Your Home" open the feature panels, so only their names can change.
- **Cuppi features** (`/admin/cuppi-features`): every in-app feature, listed by where it appears. Per feature:
  **In menu** (off hides it from the top menu only), **Published** (off removes it from the whole site),
  reorder, edit, and **Add a feature**: a name, a tile colour and the icon picture (a transparent PNG glyph)
  are enough for it to appear in the menu on its own, as "Coming soon" until it is given a page (headline,
  intro, picture). Each is a document in `cuppi_features/{slug}`; for a built-in feature it holds only the
  fields changed, and "Undo my changes" deletes it.

- **Cuppi pages** (`/admin/cuppi-pages`): a switch per section (Home, Cosy Corner, FAQ, Support, Features) between
  **Live** and **Refresh in progress**, for while it is being updated. A switched-off section shows a friendly holding
  page (menu and footer kept, links to the live parts), is marked noindex and left out of the sitemap. Saved as
  `cuppi_pages/status`; with nothing saved, Features shows the holding page and the rest are live. The legal pages
  (Privacy, Terms, Family Safety, Security) are not sections, so they are always reachable. Wired in with
  `SectionGate` in each section's `layout.tsx` (and `refreshPage()` for the home page).

How it reaches the site: `getFeatures()` (`src/lib/features.ts`) merges those documents over the built-in list
(`mergeFeatures`), and the header reads the menu (`src/lib/cuppi-site-data.ts`). Pages re-check every minute.
If the database cannot be reached, the built-in features and the default menu are used, so the site never
depends on it. Everything read back goes through `readOverride` / `resolveMenu`, which keep only fields of the
right type and addresses that are safe (a path on this site, or https), so a bad document cannot break a page.

Limits for now: the sections lower down a feature page (cards, callouts) are still written in code (an
added feature's page has just its top block); the icon fan on the home page holds eight features; the
firestore.rules and storage.rules changes must be deployed before saving works.
