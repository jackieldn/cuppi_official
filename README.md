# Cuppi + portfolio

One Next.js app serving two websites, chosen by hostname:

| Site      | Domain           | Code                  |
| --------- | ---------------- | --------------------- |
| Cuppi     | cuppi.co.uk      | `src/app/(cuppi)`     |
| Portfolio | jackiepoot.co.uk | `src/app/(portfolio)` |

Each site has its own root layout, so metadata, fonts and navigation never mix.
`src/middleware.ts` and `src/lib/sites.ts` decide which site a request belongs
to, redirect the other site's paths to the right domain, and show the portfolio
at `/` on jackiepoot.co.uk. Any other host (App Hosting's default domain,
`localhost`) gets Cuppi.

## Running locally

```bash
npm run dev
```

- Cuppi: http://localhost:3000
- Portfolio: http://jackiepoot.localhost:3000 (browsers resolve `*.localhost` themselves)

## Checks

GitHub runs these on every pull request (`.github/workflows/ci.yml`):

```bash
npm run typecheck   # TypeScript
npm test            # unit tests: HTML sanitiser, form schemas, Brevo helper, FAQ model and search
npm run build       # production build, with type checking on
npm run test:rules  # Firestore + Storage rules in the emulator (needs Java and the Firebase CLI)
```

`npm audit --omit=dev --audit-level=critical` also runs, and again every Monday.
The rules tests guard the important security property: a signed-in stranger
cannot make themselves an admin, and only admins can change data or files.

## Switching the portfolio off

Set `PORTFOLIO_ENABLED` to `"false"` in `apphosting.yaml` and redeploy.
jackiepoot.co.uk then shows a "Back soon" page and tells search engines to stay
away; `/admin` still works. Set it back to `"true"` to restore the site.

## Admin sign-in (two-step verification)

`/admin` on jackiepoot.co.uk needs a password **and** a six-digit code from an
authenticator app (Firebase Auth multi-factor, TOTP). The login page
(`src/app/(portfolio)/admin/login/page.tsx`) asks for the code, and walks an
admin through setting the app up the first time they sign in.

The admin edits Firestore and Storage straight from the browser, so the real
check is in `firestore.rules` and `storage.rules`: `isAdmin()` also requires the
token's `sign_in_second_factor` to be `totp`, which Firebase sets only after a
sign-in with a code. A password on its own can read nothing admin-only and change
nothing. The pages only route people to the right screen
(`src/lib/admin-mfa.ts`). The rules tests cover this.

**One-off rollout. The order matters, or the admin locks itself out:**

1. In the Firebase console, Authentication, Sign-in method, switch on
   *Multi-factor authentication* and enable *TOTP*. (Firebase asks you to
   upgrade to Identity Platform first; check its pricing, though TOTP sends no
   SMS so has no per-message cost.)
2. The admin account's email must be verified (Firebase requires it to add a
   second factor). If it is not, the login page offers to send the link.
3. Deploy the site (merge to `main`).
4. Sign in at `/admin/login`, scan the QR code, enter the code, then sign in
   again with a fresh code. **Do this straight away:** until an authenticator is
   added, anyone who knows the password could add their own.
5. Only now deploy the rules (they refuse any admin without a code):
   `firebase deploy --only firestore:rules,storage`
6. Keep the key (or a recovery code) from step 4 somewhere safe. To reset a lost
   authenticator, run `node scripts/reset-admin-mfa.mjs` (a dry run that lists the
   admins), then again with `--apply --email <admin email>`, and repeat step 4.
   It needs `gcloud auth application-default login` first.

Also worth switching on in the console: Authentication, Settings, *User actions*,
turn off "Enable create (sign-up)" (only the owner ever signs in) and turn on email
enumeration protection; restrict the web API key to the site's domains in Google
Cloud, Credentials. Firebase Auth throttles repeated wrong passwords and codes by
itself (`auth/too-many-requests`); the login page shows that as "wait a few minutes".

## Rate limits

Public forms that write or send something are capped per hour, in addition to
their CAPTCHA (`src/lib/rate-limit.ts`, `rate-limit-server.ts`; the numbers are
`RATE_LIMITS`). Visitors are told to wait; the hit is counted in Firestore
(`rate_limits`, server-only) under a keyed hash of their address, never the address.

| Where                                   | Limit per hour                                          |
| --------------------------------------- | ------------------------------------------------------- |
| Support form (sends an email)           | 5 per visitor, 60 for the whole site                    |
| Beta signup (stores a row)              | 5 per visitor, 300 for the whole site                   |
| Unlocking a locked project              | 10 per visitor per project, 100 per project, 40 per visitor across all projects |
| FAQ "Was this helpful?"                 | tiered, see `src/lib/faq-feedback.ts`                   |

One-off setup, so the counters clean themselves up:
`gcloud firestore fields ttls update expireAt --collection-group=rate_limits --enable-ttl --project studio-5700093446-89b93`

Plain page views are not limited here: that belongs in front of the app (Cloud
Armor or a CDN rule), not in it.

## Cuppi's look and feature pages

Cuppi has its own design system, separate from the portfolio's: the `.theme-cuppi`
block in `src/app/globals.css` (palette, fonts, motion) and the `cuppi` colours in
`tailwind.config.ts`. The brand notes (colours, type, motion, the rules for using
orange) are in [`docs/cuppi-brand.md`](docs/cuppi-brand.md).

`/features` and `/features/<slug>` are built from reusable blocks
(`src/components/cuppi/blocks`) driven by plain data (`src/lib/features-types.ts`).
For now the data is `src/lib/features-seed.ts`; `getFeatures()` in
`src/lib/features.ts` is the one place that will switch to the admin's data. The
header's Features menu and the footer are built from the same list, so a new
feature appears everywhere at once.

## Content

- Cuppi home page, blog, FAQ and legal pages: Sanity (project `0uvqbyjc`).
  - The home page now shows only the hero (the "Home page" document's banner) and
    "What's new" (the three latest Cosy Corner posts). Everything else it used to
    show moved to the feature pages under `/features`, so the document's sections
    are no longer displayed. The notes below describe the document as it was: a top banner plus an
    ordered list of sections (swipeable cards, or one large image). Edit,
    reorder, add or remove sections in the Studio; the site picks up published
    changes within about a minute. If the document is missing or incomplete the
    site shows the copy in `src/lib/home-page-fallback.ts`, so it never goes
    blank.
  - The Studio is not in this repo (`HomeOS_CSM/studio-homeos-faq` on Jack's
    machine). Its schema for the home page is `schemaTypes/homePage.ts` and
    `schemaTypes/objects/`. To create the first document from today's content:
    `node --experimental-transform-types --no-warnings scripts/home-page-seed.mjs home-page.ndjson`,
    then from the Studio folder `npx sanity dataset import home-page.ndjson production --missing`
    (`--missing` never overwrites an existing document).
  - The FAQ is the "faq" documents, shown as a help centre: `/faq` (search and
    topic cards) and one page per topic, `/faq/<topic>`, with every answer in
    the page's HTML so crawlers and AI assistants can read it. Each answer has a
    permalink, `/faq/<topic>#<question-slug>`. Search runs in the browser over
    `/faq/search-index.json` and falls back to `/faq/search?q=…` with no
    JavaScript. Which Sanity categories share a topic page is
    `src/lib/faq-config.ts`; the reading order and sub-topics of the existing
    answers are `src/lib/faq-layout.ts`, keyed by document id so rewording a
    question never loses its place. A category nobody has mapped gets its own
    page automatically, and a new answer appears after the listed ones.
  - Optional fields for the Studio's FAQ schema (the site works without them):
    `topic` (text, the sub-topic), `slug` (locks the link to an answer so
    rewording the question never breaks it), `featured` (boolean, "Popular
    questions" on `/faq`).
  - A YouTube block in an answer is embedded and plays on the page, with a plain
    "Watch on YouTube" link under it. Vertical videos (Shorts) get a portrait
    frame; the shape is read from YouTube's thumbnail and falls back to 16:9.
    Answers that are only "coming soon" are not shown.
  - Each FAQ answer has a "Was this helpful?" thumbs up/down. Votes go through a
    server action (`src/app/actions/faq-feedback.ts`) into Firestore; clients
    can never read or write those collections (`firestore.rules`). Read the
    results in the Firebase console, collection `faq_feedback`: one document per
    answer with `up`, `down`, `total` and `helpfulPct` (sort by `down` to find
    answers to rewrite). Votes are never shown on the site and never change
    what it shows. Protection: only real answer ids are accepted, one vote per
    visitor per answer (a changed mind replaces the vote), a per-visitor,
    per-answer and site-wide hourly limit that asks for a reCAPTCHA and then
    refuses, and a hidden honeypot field. A visitor is a keyed hash of IP and
    user agent that changes monthly; no raw IP is stored. One-off setup: create
    the `FAQ_FEEDBACK_SALT` secret (command in `apphosting.yaml`) before the
    rollout, and enable a Firestore TTL policy so hourly counters clean
    themselves up:
    `gcloud firestore fields ttls update expireAt --collection-group=faq_feedback_limits --enable-ttl --project studio-5700093446-89b93`
- Portfolio projects, snaps, about and apps: Firestore, edited at `/admin` on
  jackiepoot.co.uk.
  - Password-protected projects keep only their card details (title, slug,
    description, tags, cover images) in the public `projects` doc. The key's
    salted hash and the content shown once unlocked live in the admin-only
    `project_secrets/{id}` (`src/lib/project-lock.ts`). The project page sends
    the key to a server action (`src/app/actions/unlock-project.ts`), which
    checks it and returns the content only on a match, at most 10 tries per
    visitor per project per hour. One-off setup: deploy the rules, run
    `node --experimental-transform-types --no-warnings scripts/migrate-project-secrets.mjs`
    (dry run, then again with `--apply`), and enable the TTL policy for the
    counters:
    `gcloud firestore fields ttls update expireAt --collection-group=project_unlock_limits --enable-ttl --project studio-5700093446-89b93`
- `/.well-known/apple-app-site-association` (the iOS app's universal links) is
  served for cuppi.co.uk only. Don't change its path.
