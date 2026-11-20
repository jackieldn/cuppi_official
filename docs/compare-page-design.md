# Comparison page: design spec (v2)

Companion to [competitor-research-hartley-familywall.md](competitor-research-hartley-familywall.md). Revised 19 Nov 2026 after the owner's first-round notes: this is Cuppi's own comparison page, confident and Cuppi-first, not a neutral review.

## Decisions
| Question | Decision |
|---|---|
| Where the content lives | A typed data file (`src/lib/compare-data.ts`). Every claim about a rival sits next to its source and a "checked on" date. Cuppi's own price is **not** in the file: it is read from the Plans settings, so cutting the annual price later updates this page automatically. |
| Framing | Cuppi-first. "Cuppi vs Hartley and FamilyWall", intro "Three home apps, one job: make household life easier. Here is how Cuppi's features compare." Built from Cuppi's flagship features, not from the rivals'. No "which one is for you" and no "where the others win" section. |
| Rival details shown | Hartley's ownership by Yell (Companies House, linked). The exact tracking data types from both rivals' App Store labels. Not shown: hands-on notes, review quotes, the unverified £1.0m loss. |
| iOS version | The "iOS 26+" warning and the 84.2% figure are dropped. A plain "Built for" row lists each app's minimum iOS, framed as Cuppi being built for the latest iPhone design (Liquid Glass). Android is listed honestly: Hartley and FamilyWall have it, Cuppi doesn't yet. |

## Route and plumbing
- `/compare`, built as `src/app/(cuppi)/compare/page.tsx`, following `/plans`: `CuppiHeader`, `PageHero`, content, `DownloadStrip`, `CuppiFooter`, `revalidate = 60`, canonical `/compare`.
- Built on the `compare-page` branch: data in `src/lib/compare-data.ts` (tests in `tests/unit/compare-data.test.mjs`), components in `src/components/cuppi/compare/`.
- `noindex` (see `metadata.robots` in the page) until sources and dates are final. While it is hidden, it is **not** in `src/app/sitemap.ts` or the footer. At launch: remove `robots`, add `/compare` to the sitemap and the footer's Help column. A header link is a separate admin step (menu is stored data).
- Screenshots: two per app, listed in `SHOTS` in `compare-data.ts` (files under `public/images/compare/`). Cuppi's sit in the site's current iPhone render, the rivals' in a CSS-drawn older phone (notch, thick bezel). Until files are added each frame shows "screenshot to come". Rival shots should be the team's own captures, unaltered, captioned with the capture date.

## Sections
1. **Hero** (honey `PageHero`): the title, the "one job" intro, a "Checked 19 Nov 2026" chip.
2. **Why Cuppi** (headline proofs, each one verifiable): the flagship features in one app; no ads and no tracking; designed for the latest iPhone (Liquid Glass); made for UK households (DVSA, UK councils, bank holidays, supermarket receipts).
3. **Feature matrix** (Cuppi's flagship order, tinted Cuppi column): Chores, Celebrations (birthdays, anniversaries, bank holidays, In Memoriam), Pets, Shopping, Budget, Receipts, Car, Bin day, Child accounts, Security. Cuppi cells say what it does; rival cells say what was found, in a word or two. Then a "Built for" and a "Platforms" row.
4. **Your data**: the App Store label data types, listed (see below), plus Hartley's Yell ownership and commission model. Source linked on each line.
5. **Price**: three bars. Cuppi's figures are read from the Plans settings, with the free trial (1 month, 2 with an invite code) and one line on how each app is funded.
6. **One honest line** under the matrix: "Cuppi doesn't do a shared calendar, location sharing or a documents vault, and it isn't on Android yet." Short and unfussy; see "Legal basics" for why.
7. **Sources and method**: numbered, dated, "not affiliated", "spot an error? tell us".
8. **Download strip** (existing).

## Tracking data types (from the App Store labels, 19 Nov 2026)
| | Cuppi | Hartley | FamilyWall |
|---|---|---|---|
| Used to track you | None | Contact Info, User Content, Identifiers, Usage Data | Identifiers |
| Named identifiers (policy) | None | Device ad IDs (IDFA, AAID), shared with AppsFlyer, PostHog, Firebase, Meta, Google, Apple | Ad ID, IDFA, Google Advertising ID |
| Linked to you | Purchases, Financial Info, Location, Contact Info, User Content, Identifiers (stored so the app works) | Contact Info, User Content, Identifiers, Usage Data | Email, name, user ID, crash data |
| Not linked to you | Usage Data | Usage Data, Diagnostics, Other Data | Device ID, product interaction, other usage, performance and other diagnostics |
Cuppi's line carries a short explanation: Apple counts anything saved in your account as "linked", and Cuppi doesn't use it for ads or tracking.

## Paid promotion, Hartley
Hartley's trader recommendations are a commercial model, not a banner ad. The page says what its own FAQ and terms say: it "may earn a small commission" from experts and provider switches, and its terms allow lead generation. The row is "Paid promotion in the app": Cuppi "None", Hartley "Trader and switching suggestions, paid by commission (its FAQ)", FamilyWall "Ads on Free". "In our testing, Hartley pushes trader details on a dedicated page and in notifications" is the owner's observation and goes in only with dated screenshots.

## Visual language
Reuse the site's parts: `PageHero`, `TINTS`, `Reveal`, rounded `2rem` cards, the headline font, the `PlanTable` tick and dash cells, dark-mode tokens. Cuppi's column is honey. Show Cuppi's own phone screens to carry the Liquid Glass point; no rival screenshots (copyright) and no logos.

## Data shape (`compare-data.ts`)
`apps`, `facts` (group, label, one value per app, `sourceIds`), `sources` (id, label, url, `checkedOn`). A unit test checks every rival claim cites a source and every source has a date.

## Legal basics (UK, not legal advice)
- "Best", "loved" and similar are puffery. Specific claims about a rival (features, tracking, price, ownership) must be true, verifiable and about comparable things.
- Selecting rows from Cuppi's features is fine. Words like "everything you need" or "the most complete" aren't, unless the full picture backs them up, which is why the one honest line stays.
- No denigration. "Looks like an Android app", "pushy", "feels technical" are opinions about a rival and stay off the page. Cuppi's own design does the talking.
- Naming rivals in a comparison is allowed. No logos, no implied endorsement, add "not affiliated".
- Hartley's "automatic" claims and Yell ownership rest on their own pages and Companies House, linked.

## Before it goes live
1. Owner checks the rivals' in-app features: Hartley's pets (flea, worming, vaccination?), and both rivals' chores and celebrations equivalents. Cells stay "to confirm" until then.
2. Dated screenshots for any "in our testing" line.
3. Re-check each fact against its live source; update the dates.
4. Fix the stale "Coming soon" tags on Chores, Shopping and Car.
5. A quick legal read.
6. Remove `noindex`.

## Update, 20 Nov 2026: admin, snapshots, frames

This reverses the "typed data file, no admin" decision. The facts now live in Firestore (`cuppi_home/compare`) and are edited in the Cuppi admin under **Comparison**; the defaults in `src/lib/compare-data.ts` are what the page shows until something is saved (`resolveCompare` in `src/lib/compare-settings.ts` reads whatever is stored defensively, field by field).

- **Admin** (`/admin/cuppi-compare`): tabs for Page (freshness date, Why Cuppi, small print), Matrix (groups, rows, cells, sources per rival cell), Privacy, Prices, Sources (with "I checked everything today"), Screenshots and Snapshots. Saving is refused with plain-English reasons if a rival cell says something without a source, a source is missing or undated, a screenshot has no description, and so on (`validateCompare`, which also runs over the defaults in the tests).
- **Snapshots** (`/compare/snapshots`): the proof page. One block per matrix row, app by app, up to three screenshots each in the site's rounded corners with no phone frame, with the app version, phone, date and what was done. The "Tested by the Cuppi team" source links to it. The admin lists every claim that cites that source and still has no screenshot.
- **Screenshots**: up to three per app on the comparison page ("A look inside"), and up to three per app per snapshot. Uploaded straight from the admin, shrunk to 1290px wide and saved as WebP in `cuppi_home/compare/`. The existing storage and Firestore rules already cover this, so nothing needs deploying.
- **Frames**: the iPhone 17 Pro frames are now WebP (`iphone-front-mockup.webp`, `iphone-45d-mockup.webp`) and the old PNGs are removed. The rivals' phones use `iphone-X-front-mockup.webp`, with the screen opening measured from the image (702 by 1483 at 49, 41 in 799 by 1559).
- Still hidden: both pages are `noindex` and not in the sitemap or footer.
