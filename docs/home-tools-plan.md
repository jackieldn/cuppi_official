# Cuppi Home Tools: plan (draft)

Free, no-sign-up calculators and helpers for UK home life, at `cuppi.co.uk/tools`. The goal is
search traffic that is relevant to the app, and a calm, believable route from "I just worked out my
mortgage" to "Cuppi keeps the rest of my home in order".

Nothing here is built yet. This is for arguing with.

## 1. Principles

- **UK first.** Cuppi is "the British Home super-app". UK rules (Stamp Duty, LBTT, LTT, overpayment
  allowances, Lifetime ISA, council tax) are the angle the big global calculators do badly, and the
  one a UK searcher actually wants.
- **Private by design.** Every calculation runs in the browser. Nothing typed is sent or stored. Say
  so on every tool; it is on-brand ("calm and private") and it needs no consent banner for the tool
  itself. Share links carry the numbers in the URL only.
- **Honest numbers.** All rates, thresholds and bands live in one file (`src/lib/tools/rates.ts`)
  with a `lastReviewed` date shown on the page ("Rates checked November 2026"). Tax rules change at
  Budgets and in April; stale rates are the fastest way to lose trust (and rank).
- **Illustrative, not advice.** Mortgages are FCA-regulated. Tools show what a number means, never
  "you should". Reuse the admin-managed disclaimer system (`{i:id}` tags) so the wording is
  written once.
- **Every tool earns its place for Cuppi.** Each one ends with a relevant, quiet call to action
  (Budget, Bin Days, Pets, Celebrations, Receipts), not a generic banner.
- **Be realistic about head terms.** "Mortgage calculator" is owned by MoneySavingExpert, Which?,
  lenders and Moneyfacts. A new domain wins on specific, UK-nuanced, long-tail pages and on being
  genuinely nicer to use, not on the head term. Check demand before building each tool (see
  section 7).

## 2. The tools

Effort: S = a day or less, M = a few days, L = a week or more. Maths is pure functions with
known-answer tests, so effort is mostly UI, content and rate data.

### Wave 1: the money core (build first)

| # | Tool | What it does | Effort |
| --- | --- | --- | --- |
| 1 | **Mortgage repayment calculator** | Monthly payment, total interest, total cost; repayment vs interest-only; year-by-year balance chart and full schedule (print / CSV). | M |
| 2 | **Mortgage overpayment calculator** | Monthly overpayment or one-off lump sum: time and interest saved. Flags the usual 10% a year early-repayment-charge allowance and lets you set it. This is the "early repayment" tool. | M |
| 3 | **Stamp Duty calculator** | England and NI (SDLT), Scotland (LBTT), Wales (LTT). First-time buyer, additional property, non-UK resident. Shows each band's slice, not just the total. | M |
| 4 | **How much can I borrow?** | Income multiples (e.g. 4 to 4.5x, joint incomes), deposit, rough affordability check, monthly cost at a few rates. | S |
| 5 | **Loan repayment + early repayment calculator** | Personal / car / credit-card style loans: payment, total interest, effect of overpaying or settling early (with an optional early-settlement fee). | M |

### Wave 2: buying and moving

| # | Tool | What it does | Effort |
| --- | --- | --- | --- |
| 6 | **Remortgage / "my fix is ending"** | Current deal vs new deal(s), including fees: total cost over the fix and the payment shock when a fix ends. | M |
| 7 | **True cost of buying a home** | Deposit, Stamp Duty, solicitor, survey, valuation, removals, first-month costs: a printable upfront-cash number. Reuses tool 3. | S |
| 8 | **Deposit savings goal** | Time to a target deposit, with a Lifetime ISA 25% bonus toggle and a savings rate. | S |
| 9 | **Rent vs buy** | Total cost over N years with explicit, editable assumptions (price growth, rent growth, return on a deposit). | M |
| 10 | **Rate-rise stress test** | "What if my rate goes up 1, 2, 3%": payment at each step, against take-home pay. | S |
| 11 | **Moving checklist and timeline** | Enter a completion date, get a dated, printable to-do list (utilities, redirects, council tax, bin day). Natural Cuppi reminders hook. | M |

### Wave 3: everyday home life (low competition, closest to the app)

| # | Tool | What it does | Cuppi link |
| --- | --- | --- | --- |
| 12 | **Household bills splitter** | Split bills equally or by income share, with a clear "who owes whom" summary. | Budget, Home members |
| 13 | **Appliance running cost** | Watts x hours x unit rate. Unit rate is editable and prefilled from a single, dated Ofgem price cap constant. | Budget |
| 14 | **Paint / wallpaper / flooring calculator** | Room dimensions to litres, rolls or packs, with waste allowance. Evergreen DIY searches. | Receipts |
| 15 | **Lifetime cost of a pet** | Dog or cat, by size and age: food, insurance, vet, boarding, over a lifetime. | Pets |
| 16 | **Christmas / celebrations budget** | Gifts, food, travel split by person, with a running total. Seasonal spikes. | Celebrations |
| 17 | **Monthly budget planner** | Income to 50/30/20 (editable) with a UK bills starter list. Gateway to the Budget feature. | Budget |

### Wave 4: advanced (only after waves 1 to 2 show traction)

- **Mortgage deal comparison:** up to three deals side by side, including fees, cashback and ERCs.
- **Buy-to-let yield and return:** gross and net yield, mortgage cost, the "additional property" Stamp Duty
  surcharge. Different audience; only if it is wanted.
- **Home energy upgrades:** solar, heat pump or insulation payback, with transparent assumptions.
- **Overpay or invest?:** overpaying the mortgage vs savings or investing. Highest risk of reading as
  advice, so it needs careful wording and probably a human read-through before it ships.
- **Bring it into Cuppi:** "Send this to my Cuppi Budget" via a universal link (`aasa` route already
  exists). Needs app-side work and a decision about what the app accepts.

### Deliberately not in the plan

- **Bin day lookup by postcode.** Councils have no common API, so this is a large data project. The
  Cuppi Bin Days feature page is the right home for that story.
- **Council tax estimates by address.** Needs VOA band data and authority rates. Revisit later.
- **Anything that needs a lender feed or affiliate links.** Introducing a broker or lender referral
  makes Cuppi a credit broker, which needs FCA authorisation. Do not add it casually.

## 3. How it fits the codebase

All of this lives in the `(cuppi)` route group, following patterns already in the repo.

```
src/lib/tools/
  registry.ts           slug, title, description, group, tint, status, related tools
  rates.ts              Stamp Duty bands, ISA bonus, price cap, ... + lastReviewed dates
  mortgage.ts           pure maths: payment, schedule, overpayment
  stamp-duty.ts         SDLT / LBTT / LTT
  ...one file per tool  pure functions, no React, no imports from the app
  content/<slug>.ts     intro, "how it works", worked example, FAQs, related links (typed data)
src/components/cuppi/tools/
  tool-shell.tsx        PageHero, privacy note, disclaimer, CTA, related tools
  money-input.tsx, percent-input.tsx, term-input.tsx, results-card.tsx
  schedule-table.tsx, balance-chart.tsx (hand-drawn SVG, no chart dependency)
  <slug>.tsx            'use client' calculator
src/app/(cuppi)/tools/page.tsx           hub (the /features page is the model)
src/app/(cuppi)/tools/[slug]/page.tsx    server page: metadata, JSON-LD, content, calculator
src/app/(cuppi)/tools/[slug]/opengraph-image.tsx   per-tool share image
tests/unit/<tool>.test.mjs               known-answer tests (same style as the existing suite)
```

Wiring that is easy to forget:

- **`src/lib/sites.ts`:** add `'tools'` to `CUPPI_PATHS`, or `src/middleware.ts` will not treat it as a
  Cuppi path (it redirects by this list).
- **`src/app/sitemap.ts`:** add `/tools` and every `/tools/<slug>` (with `lastModified` taken from the
  tool's `lastReviewed`).
- **`src/lib/page-status.ts`:** add a `tools` section so the whole area can be put into "refresh in
  progress", like Features and the FAQ.
- **Menu and footer:** a "Tools" link through the admin menu settings (no code) and a footer link
  (`footer.tsx`).
- **Why a code registry, not Firestore:** Features are admin-edited content; calculators are code
  plus a little copy, so copy and rates in typed files with tests is simpler and safer. The admin
  can still toggle visibility later if wanted.
- **Design:** reuse `PageHero`, `Reveal`, `DownloadStrip`, the brand tints and tokens
  (`docs/cuppi-brand.md`). Mobile first; inputs need correct `inputMode`, labels and error text
  for accessibility (WCAG AA is already the site's standard).
- **State:** inputs mirrored to the query string (`?price=300000&rate=4.5`) so a result can be
  shared and a search engine sees clean URLs (canonical is the plain path).

## 4. SEO and content (the part that brings the traffic)

Each tool page is a real page, not just a widget:

1. One H1 with the searcher's words ("Mortgage overpayment calculator").
2. The calculator above the fold, a plain-English result summary under it.
3. A worked example with real numbers (also gives the page quotable, link-worthy content).
4. "How it works" and "What this doesn't include" (honest limits build trust).
5. 4 to 6 FAQs, written for the question people actually type.
6. Related tools and one or two Cosy Corner articles (Sanity), plus the relevant Cuppi feature.
7. `lastReviewed` shown, and the rates file dated.

Structured data via the existing `JsonLd` component: `WebApplication` (FinanceApplication) and
`BreadcrumbList` for every tool; `FAQPage` is cheap to add but Google now shows FAQ rich results
for very few sites, so treat it as machine-readable hygiene, not a ranking lever. AI crawlers are already
allowed in `crawlers.ts`, so well-structured worked examples can be quoted in answers.

Hub page `/tools` groups by life stage (Buying, Borrowing, Moving, Everyday) and is the page to
link from the home page, header and footer.

## 5. Measuring it

- **Search Console** (free, no cookies) first: impressions and clicks per tool page. Verify the
  domain before launch so there is a baseline.
- **Installs:** give each tool its own App Store campaign token on its download link so installs
  can be attributed per tool in App Store Connect.
- **On-site analytics:** none exists today (the consent banner stores a choice but no analytics
  tool is wired up). If wanted, use a cookieless option or gate it on the existing
  `cookie_consent` flag. This is a decision, not a given.
- Judge each tool at about 8 to 12 weeks, then double down or stop. New pages take time to rank.

## 6. Delivery order and size

1. **Foundation** (M): registry, shell, shared inputs / results / chart / schedule, hub page,
   sitemap, `CUPPI_PATHS`, page-status, footer link, JSON-LD, OG image template.
2. **Tool 1** (mortgage repayment) built end to end as the pattern, including tests and content.
3. **Tools 2, 3** next (overpayment and Stamp Duty; both reuse tool 1's maths or shell).
4. **Tools 4, 5**, then ship Wave 1 together with a home-page and header mention.
5. Wave 2 in order of what Search Console shows, Wave 3 once the pattern is cheap.

Each step is its own branch and merge, as the repo already does.

## 7. Risks and open questions

- **Stale rules.** Stamp Duty and other thresholds change at Budgets and in April. Mitigation: one
  rates file, a `lastReviewed` date on every page, tests pinned to the published bands, and a
  recurring reminder after each Budget and in March. I can set that reminder up.
- **Rates I quote must be re-verified when each tool is built.** I have not looked up current
  figures for this plan; the tool for each wave should start with checking GOV.UK, Revenue Scotland
  and the Welsh Revenue Authority.
- **No keyword data yet.** The ordering above is judgement. A short pass on search demand and who
  ranks for each term (Search Console on cuppi.co.uk, plus a keyword tool) should happen before
  committing to Waves 2 to 4.
- **Regulated territory.** Keep to illustrative maths. Do not add lender or broker links without
  FCA advice. Wave 4's "overpay or invest" needs extra care.
- **Maintenance cost is real.** Every tool is something to keep correct. That is why the plan
  starts with five and stops to measure.
- **Brand fit.** These are "calm British home" tools, not a finance portal. Wave 3 keeps the
  site's centre of gravity on home life rather than mortgages alone.
