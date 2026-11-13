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
  upload gets a new token). **SVGs too:** by default `next/image` does not proxy an SVG, so SVG feature icons
  went straight to Firebase, uncacheable, and the menu icons arrived late on every open. `next.config.ts` sets
  `dangerouslyAllowSVG` (with a sandboxing CSP on `/_next/image`) so they go through the same cache. Do not
  switch it off, or give a feature icon `unoptimized`.
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

A feature page is a hero plus a list of sections (blocks, `src/lib/features-types.ts`). Each section is one
of seven templates, reusable layouts in `src/components/cuppi/blocks`:

| Template (`type`) | What it is |
| --- | --- |
| `showcase` "Words and phone" | Text on one side, a phone rising out of a colour card on the other |
| `tabs` "Explainer tabs" | A colour card: a list of short topics, one open at a time, beside a picture that swaps with it. The "Made for each other" layout. Topics stack above the picture on a phone. |
| `banner` "Big picture" | A headline over one full-width picture. The "A whole family of possibilities" layout. |
| `video` "Video" | A tutorial or an ad: YouTube link or an uploaded file, **widescreen (16:9) or phone-shaped (9:16)**, full width or beside its words |
| `cards` "Phone cards" | A swipeable row of phone cards |
| `callout` "Big sentence" | One big warm sentence on a colour band |
| `points` "Reasons" | Short reasons, no images |

Pictures (`FeatureImage.fit`) are:

- `frame`: **a plain app screenshot the site puts inside an iPhone**, reusing the home hero's `PhoneMockup`
  (`FramedPhones`, `blocks/framed-phones.tsx`): face forward or turned 45 degrees (`frame`), mirrored (`flip`), with the
  app's background colour (`bg`) behind any part of the screen the screenshot does not cover. The phone is taller than its
  card and hangs from near the top, so the top of the app shows. Add `second` for **two phones side by side**, arranged
  (`arrange`) with the right one lower (default), the right one higher, or both level at the same size with a small gap;
  turned phones face each other (or apart, with `flip`).
  **View** (`view`, per phone): `top` (default) shows the top of the screenshot; `bottom` moves the phone up until its bottom
  edge sits the same gap above the card's bottom as its top edge sat below the card's top in a top view (the phone is
  whole at both ends, never cut off), for screens whose content is at the bottom. Each phone of a pair
  has its own, so all four pairings work (top/top, top/bottom, bottom/top, bottom/bottom). In a bottom view the "lower"
  phone of a staggered pair keeps that gap and the other is raised by the same stagger.
  **Slide** (`slide`, a tickbox on a single framed phone) goes to the other end of the screenshot: while the cursor is over the card a top view eases up (2.2s) until the bottom of
  the screenshot reaches the bottom of the card (a bottom view eases down to the top), and eases back when the cursor leaves (1.1s).
  `phoneTops` (`phone-mockups.ts`) works the distance out from the screenshot's own proportions, so a screenshot shorter
  than the screen does not slide up into empty background (a pre-cropped one, like the home hero's, needs none). The
  CSS is `.phone-slide` in `globals.css`. Mouse and pen only (`@media (hover: hover)`): a touch screen has no hover, so
  the phone stays still; reduced motion jumps instead of gliding. Not offered with two phones. The screenshot layer's corner radius and a few pixels of overscan
  (`SCREEN_RADIUS`, `OVERSCAN` in `phone-mockups.ts`) are tuned to the frame renders so no see-through wedge or hairline
  shows round the screen; re-measure them if a frame render changes. New phone sections start as `frame`. The admin records the
  screenshot's real size (`width`, `height`) when it is chosen, so the frame is laid out before the picture loads.
- `phone`: a ready-made transparent phone crop that rises from the bottom edge (what the built-in pages use). It keeps its
  proportions; it used to be stretched into a square, which distorted a plain screenshot.
- `photo`: full-bleed, cropped to fit.
- `contain`: shown whole, centred, with room round it (a phone beside a watch).

**Video.** A widescreen video is a card of its own. A phone-shaped one would be a sliver in the same space, so it
stands in a colour card at a sensible height (never taller than 75% of the screen). A YouTube video (any link shape,
Shorts included) loads as a still with a play button: the page fetches no YouTube code and sets no cookies until the
visitor presses play, then it swaps in the privacy-enhanced embed (`VideoPlayer`). A file is a plain `<video>` with the
browser's controls. The cover is the admin's picture, else YouTube's own (the 9:16 one keeps its shape), else the
file's first frame.

**To add a template:** write the component in `blocks/`, add its type to `FeatureBlock` in `features-types.ts`, add a
case to `block-renderer.tsx`, then in `src/lib/feature-sections.ts` add it to `SECTION_TEMPLATES`, `newSection`,
`readBlock` (the safe reader), `validateSections` and `mapBlockUrls`; then a form in
`src/components/admin/cuppi/section-forms.tsx` and a thumbnail in `SectionThumb` (`feature-page-admin.tsx`). The
unit tests (`tests/unit/feature-sections.test.mjs`) loop over `SECTION_TEMPLATES`, so they catch a missing piece.

Built-in features start from `src/lib/features-seed.ts`; the admin's sections (below) replace them.

## Disclaimers

Cuppi suggests reminders for health, pets and money, so wherever the words could be read as advice there is a disclaimer: a
small **(i)** beside the word, and a bubble with the notice when it is hovered, tapped or tabbed to.

**How it works.** A disclaimer is written once, in the admin under **Cuppi > Disclaimers** (`/admin/cuppi-disclaimers`), with a
tag name (`health`), the words for its bubble (up to 700 characters), and a name for the admin's own use. It is stored as one
document, `cuppi_home/disclaimers` (public read, admin write: the existing `cuppi_home` rule), and read on the server
(`getDisclaimers`, `src/lib/cuppi-site-data.ts`) through `resolveDisclaimers` (`src/lib/disclaimers.ts`), which drops an entry
with a bad tag name or no words, so a bad document cannot break a page. The wording lives in one place: change it there and every
use changes.

**Using one.** Type its tag **straight after the word, with no space**, in any heading or paragraph on a feature page (every
template) or the home hero: `Medication{i:health} reminders`. The word and its icon never wrap onto separate lines. A tag with no
matching disclaimer shows nothing. Tags cannot go in a label chip, a tab's title (it is a button) or a page description; those
strip them (`stripDisclaimers`). Wherever page text is drawn it goes through `MarkedText` (`src/components/cuppi/marked-text.tsx`),
which works in server and client components; to support tags in a new place, wrap its text in that.

**The bubble** (`DisclaimerMark`, `src/components/cuppi/disclaimer.tsx`):

- Opens on a mouse hovering over the icon (after 120ms) and stays while the mouse is over the bubble, so the words can be read or
  selected; closes 220ms after the mouse leaves both.
- Opens when the icon is reached with the **keyboard** (a focus ring shows); Enter or Space toggles it; **Escape** closes it.
- A **tap** toggles it, because a touch screen has no hover; a tap elsewhere closes it. A click after a hover does not close what the
  hover opened.
- It is drawn outside the card it sits in (a colour block's rounded edge never clips it) but inside `.theme-cuppi`, so it has the
  right colours in light and dark. It flips below the icon when there is no room above, and is never wider than the screen.
- The icon is `0.4em` (at least 1rem), raised like a footnote, at 60% opacity until hovered. The tap area is larger than the icon.
  Its accessible name is "Important information: <name>".

**In the admin**, the page builder and the home hero editor show the live disclaimers in their previews, the page builder lists
the tags to copy, and saving a page reports a tag that has no disclaimer. The Disclaimers page has a "Try it" sample for each. A
saved tag name cannot be renamed (pages may use it); to retire one, remove it and any page still using it shows no icon.

The wording of a disclaimer is a legal matter: the site ships with none, and what to say (and where) should be agreed with
whoever advises on it. Which features need one is a content decision: nothing is added to the existing copy.

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
discount. It is one small piece of data (headline, text, one quiet link, a screenshot,
which phone, a tint, a pattern), edited in the admin under **Cuppi > Home hero** and
stored as `cuppi_home/hero`. `src/lib/home-hero.ts` is its starting point and holds the
screenshot, which the admin does not change yet. Wrap a word in `*asterisks*` in the
headline to set it in italic.

The hero has three templates (`split`, `split-reverse`, `centred`; `HomeHero` in
`src/components/cuppi/home/hero.tsx`) that share the same words and phone. Everything
stored is read through `resolveHeroSettings` (`src/lib/home-hero-settings.ts`), which
fills gaps from the original hero and clamps every value, so a bad document cannot break
the page. To add a template, add it to `HERO_TEMPLATES` and handle it in `HomeHero`.

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

A screenshot within 5% of the screen's shape is scaled to fill the whole screen (`fillsScreenByCover`, `NEAR_FULL` in
`phone-mockups.ts`), trimming a sliver off its sides. Real iPhone screenshots are 0.7% shorter than this render's screen,
so without it a strip of the `bg` colour showed along the bottom edge. Shorter screenshots (pre-cropped ones) still sit at
the top with `bg` filling the rest.

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
When it scrolls into view, the in-app icons (up to eight features, as `AppTile`s) slide out of it to the
left and right, the nearest first, and settle with a small overshoot
(`AppFan`, `src/components/cuppi/home/app-fan.tsx`; the layout is the `.fan` block in `globals.css`). It
plays once. Icons take turns going right then left. Which features appear, and in what order, is set in
the admin under **Cuppi > Icon banner** (stored as `cuppi_home/fan`, read through `resolveFan` in
`src/lib/fan-settings.ts`). The pictures are the features' own, so change one on the Cuppi features page.
Until anything is saved it is the first eight features in menu order; a feature added later waits switched
off. The layout holds eight (`FAN_MAX`); a ninth needs a new slot. The FAQ topic tiles take their icons from
the matching feature in the same way (`faqTile`).

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

- **Disclaimers** (`/admin/cuppi-disclaimers`): the notices behind the (i) icons in page text; see Disclaimers above.
- **Page sections** (`/admin/cuppi-features/<slug>`, the **Sections** button on a feature that has a page): the page
  builder. Two columns like the home hero editor: the page as the site draws it on the left (the real `FeatureHero` and
  `BlockRenderer`, at desktop width, scaled to fit; click a section to edit it), the sections on the right. **Add a
  section** opens the template picker; each section can be reordered, duplicated, removed, or have another added after
  it. Pictures and videos chosen are shown at once and uploaded when **Save page** is pressed (to
  `cuppi_features/<slug>/sections/` in Storage; images up to 10 MB, videos MP4/WebM/MOV up to 200 MB). Saved as the
  `blocks` field of `cuppi_features/<slug>`, which replaces the built-in sections for that feature. **Start again from
  the original** deletes just that field. The top block (headline, intro, picture) is still edited with Edit on the
  features list.

  What is stored goes back through `resolveBlocks` (`src/lib/feature-sections.ts`) on every read: an unknown template, a
  section missing what it needs, or an address that is not allowed (`src/lib/safe-urls.ts`: this site, our own
  Storage bucket, https for a video file, any YouTube link) is dropped by itself, so a bad document can leave a gap but
  never break the page. `validateSections` is the stricter, plain-English check run when Save is pressed.

Limits for now: the icon fan on the home page holds eight features; a page holds up to 30 sections and 8 items
(cards, topics, reasons) in each; the firestore.rules and storage.rules changes (storage now also allows video up to
200 MB under `cuppi_features/`) must be deployed before saving works; a video file is not transcoded, so use MP4 (H.264)
for it to play in every browser, or upload long or large videos to YouTube and paste the link.
