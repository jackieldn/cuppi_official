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

## Content

- Cuppi home page, blog, FAQ and legal pages: Sanity (project `0uvqbyjc`).
  - The home page is the single "Home page" document: a top banner plus an
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
- Portfolio projects, snaps, about and apps: Firestore, edited at `/admin` on
  jackiepoot.co.uk.
- `/.well-known/apple-app-site-association` (the iOS app's universal links) is
  served for cuppi.co.uk only. Don't change its path.
