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
npm test            # unit tests: HTML sanitiser, form schemas, Brevo helper
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

- Cuppi blog, FAQ and legal pages: Sanity (project `0uvqbyjc`).
- Portfolio projects, snaps, about and apps: Firestore, edited at `/admin` on
  jackiepoot.co.uk.
- `/.well-known/apple-app-site-association` (the iOS app's universal links) is
  served for cuppi.co.uk only. Don't change its path.
