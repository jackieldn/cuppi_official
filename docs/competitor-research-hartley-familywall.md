# Cuppi Home vs Hartley vs FamilyWall: research brief

Gathered 19 Nov 2026, before any design work, and revised the same day with the owner's corrections (prices, trial,
iOS share data, full Cuppi feature list). Sources: the apps' own App Store pages, websites, privacy policies and terms,
the public App Store reviews feed, the Cuppi docs portal and site repo, and a worldwide iOS-version CSV (Oct 2025 to Oct 2026).
Nothing was tested hands-on in the rivals' apps. Every claim the comparison page makes should be re-checked and dated at launch.

## 1. At a glance

| | **Cuppi Home** | **Hartley** | **FamilyWall** |
|---|---|---|---|
| What it is | UK household hub: shopping, pets, celebrations, bin day, budget, receipts, car, chores, private feed | UK "home admin autopilot": document vault that reads paperwork, renewal tracking, AI chat, tradesperson matching | Family organiser: shared calendar, lists, messenger, photos, location; budget, meals, documents on Premium |
| Company | JackiePoot Creations Ltd (UK) | Hartley Technology Ltd, Reading, UK, controlled by Yell Holdco Ltd (Yell group); App Store since 5 Nov 2025 | Family & Co (Paris), part of In Tandem Families with OurFamilyWizard and Cozi |
| Platforms | iPhone only, iOS 26+ | iOS (16.4+) and Android | iOS (17+), Android, web, visionOS |
| App Store (UK) | 5.0 stars, 4 ratings, v1.3.1 (1.4.0 in development), 13+, English and Hungarian | 3.8 stars, 38 ratings, v1.9.1, 4+ | 4.8 stars, 9.6k ratings, v2026.11.1, 4+, 11 languages |
| Price | Free tier. Pro £5.99/month or £59.90/year (2 months free). **1 month free trial, 2 months with an invite code** | Free, "no subscriptions", but see monetisation | Free with ads. Premium £5.99/month or £39.99/year (UK App Store). 30-day trial |
| Ads | None | None seen | Yes on Free. "Ad free" is struck out of the Free column on their Premium page, and their Terms say users "may be presented with advertisements" |
| Tracking (App Store label) | No "Data Used to Track You" section. Linked to you: Purchases, Financial Info, Location, Contact Info, User Content, Identifiers. Not linked: Usage Data | "Data Used to Track You": Contact Info, User Content, Identifiers, Usage Data | "Data Used to Track You": Identifiers |

Per-year cost: Cuppi Pro £59.90 (about £4.99 a month), FamilyWall Premium £39.99 (about £3.33 a month), Hartley £0.

### How Cuppi's label should be explained

Apple makes a developer list everything saved in the cloud against an account as "collected and linked to you", even when
the developer never uses it. That is why Cuppi's label shows purchases, financial info and so on. The honest framing is
"stored so the app works for your household, never used for ads or tracking". Two wording cautions:
- Avoid "we have no access to it" as an absolute page claim. The docs describe a staff admin app for support, moderation and sensitive-access grants, receipts are read by Google Gemini on Vertex (EU region), and project owners can reach the database. "We don't use it, sell it, or track you with it" is accurate and safe.
- Say "no tracking", never "collects no data".

## 2. Cuppi: confirmed features

**Household and family**
- Complete household management: create or join by invite link, roles (owner, adult, child), permission settings, blocking, household ownership transfer, leave or delete with a revival window.
- Restricted child users, including parent-supervised email and password changes. Analytics force-disabled for child accounts.
- Home Feed: private family wall with image and gift posts, reactions, link sharing, comments, GIFs.
- Companion: weekly and monthly overviews and smart posts, built on the phone from the household's own data.

**Celebrations:** Birthdays, Anniversaries, UK Bank Holidays, In Memoriam, gift ideas. One cap across them (Free 50, Pro 200).

**Pets:** full management: vaccinations, medication schedules and dose tracking, vet and emergency vet details, healing tracker, weight tracker, insurance details, appointments, microchip details, health-timeline PDF export.

**Shopping:** shared and private lists, live collaborative Shopping Mode, automatic category sorting, list splitting between people, offline-first, Siri.

**Budget:** automatically renewing budget, 15-minute Budget Builder, payday and countdown, monthly splits showing who pays how much, price-change review before renewal.

**Bin day:** England council website search, bin profiles, reminder at 6pm the evening before.

**Receipts:** automatic digitisation, itemised spending tracker, search, enhanced (cloud AI) processing, barcode scanner and display. Free 10 receipts a month.

**Car (UK):** automatic MOT reminders connected to the DVSA, MOT history, car details from the DVSA, tax and insurance countdowns, spend tracking (charging/fuel, service, parking and crossings, penalties, accessories and other), tyres with a digitised tyre sticker, warranties. Free 1 car, Pro 5.

**Chores:** starter pack of 45 templates in 6 packs, private and shared, assignable, daily and weekly reminders, 07:00 digest.

**Security and control:** Security Centre with biometric login, 2-step verification and an account sensitive-activity log. App customisation, full notification control (app and marketing separately). Sign in with Apple, email or anonymous trial; App Attest; local data encrypted (AES-GCM-256, Keychain key); backend in London (europe-west2).

**Support:** in-app support messaging, 200+ Q&A answers.

**Siri:** nine App Shortcuts, full-sentence App Schema intents on iOS 27.

**Growth:** referral programme (12 validated referrals earns Lifetime Pro).

**Cuppi's App Store listing (checked 19 Nov 2026)**
- Subtitle "The British home super-app"; "No ads. No tracking. Total privacy for your home." and "100% ad-free and tracker-free".
- Already sells Car, Chores, Shopping, Bin Days, Receipts and Budget as live. The site still tags Chores, Shopping and Car "Coming soon", which is stale.
- Limits to own on the page: iPhone only, UK only, bin days England councils only, 4 ratings.

**Gaps against the rivals:** no shared calendar, no location sharing, no general document vault, no messenger beyond the feed, no recipes or meal planner, no tradesperson matching, no Android.

## 2b. Reach: how much of the market runs iOS 26?

Cuppi is UK-only, so the UK file (monthly, Nov 2025 to Oct 2026) is the one to use. The worldwide file is kept for reference.

| Month (UK) | iOS 26 or later | of which iOS 27 | iOS 18 | iOS 16 or earlier |
|---|---|---|---|---|
| Nov 2025 | 5.6% | 0% | 84.0% | 7.4% |
| Jan 2026 | 36.2% | 0% | 54.2% | 6.8% |
| Apr 2026 | 74.8% | 0% | 15.9% | 7.6% |
| Jul 2026 | 82.0% | 0.3% | 11.5% | 5.1% |
| Oct 2026 | **84.2%** | 17.8% | 11.5% | 3.4% |

Worldwide, Oct 2026: iOS 26 or later 77.6%, iOS 27 17.2%, iOS 18 15.9%, iOS 16 or earlier 4.5%.

- **In the UK, 84.2% of iPhones can run Cuppi** (worldwide 77.6%). iOS 17 or later is 96.5%, so FamilyWall's floor reaches about 96.5% and Hartley's iOS 16.4 floor slightly more. The gap is roughly 12 points, not the 22 points the worldwide figure suggests.
- The UK climbed from 5.6% to 84.2% in a year and is still gaining. iOS 27 is already 17.8%.
- iOS 18.7 alone is 7.4% in the UK, but all of iOS 18 is 11.5%. Use the total below iOS 26 (15.8%), not the 18.7 figure.
- Neither file splits by iPhone model.
- Suggested page line: "Cuppi needs iOS 26, which 84% of UK iPhones now run (Oct 2026)", shown as a dated figure rather than a hidden requirement.

## 3. Hartley

**Features:** Vault for policies, bills and warranties (camera, files, cloud drives, inbox import) with automatic date and detail extraction. Renewal and deadline tracking for MOT, boiler service, insurance, warranties. Savings nudges before auto-renewal. AI chat that queries your documents, schedules maintenance, and diagnoses a photo of a problem. Local expert matching. Household sharing with a partner by email invite, each member with their own chat history. Contact book of tradespeople.

**Money:** free to use. Their FAQ says "We may earn a small commission if you choose to connect with local experts or switch utility providers". The Terms allow future paid features and "lead generation".

**Data and tracking (their policy, updated 4 Sep 2026)**
- Collects name, address, property and car registration, every uploaded document, chat content, and usage analytics.
- Sub-processors: Yell Limited (your contact details go to a tradesperson you choose), AWS (Ireland, with some AI processing in the US), Google Gemini for document and chat AI.
- With consent, shares IDFA/AAID plus event data with AppsFlyer, PostHog, Firebase, Meta, Google and Apple. Says it never shares document contents with ad platforms and hashes identifiers.
- Website says "We never sell or share your data". Their App Store label lists User Content and Contact Info as data used to track. These need reconciling, so quote both sources rather than characterising either.
- Internal inconsistencies: Terms say no backups are kept after deletion, the policy says encrypted backups are kept and rotated out. The policy says it "does not currently send marketing" and also that it may.
- UK residents only, liability capped at £100, no liability for AI "hallucinations" or missed reminders.
- Security claims: "bank-level" encryption, CASA Tier 2 assessed by DEKRA.

**Reviews (23 recent):** 14 five-star. Praise: finding documents, MOT catches. Complaints: too many irrelevant notifications, must sign up and give an address before seeing the app, postcode screen failures, Touch ID failing on iPad, AI chat saying it created tasks it hadn't, "no way am I giving all my details to an AI app".

## 3b. Hartley ownership (Yell group)

| Fact | Status |
|---|---|
| Hartley Technology Limited, no. 16471418, incorporated 23 May 2025, SIC 62012, registered office Davidson House, The Forbury, Reading RG1 3EU | Verified on Companies House, 19 Nov 2026 |
| Sole person with significant control: **Yell Holdco Limited (no. 12315720)**, notified 23 May 2025 (incorporation day), holding 75% or more of shares and voting rights and the right to appoint or remove directors | Verified on Companies House |
| Same registered address as Yell. Director Luke Andrew Taylor on Hartley's officer list (current officers include Paul Manwaring as secretary and David Marshall and Robert Hall as directors) | Verified on Companies House; his Yell Limited directorship not checked |
| Yell Limited (no. 04205228) is the trading arm, and Hartley's privacy policy names it as a processor that receives your contact details when you contact a tradesperson | Policy wording verified; company number not checked |
| Yell Holdco FY26 report (year to 31 Mar 2026) consolidates Hartley with a £1.0m operating loss; Yell links Hartley to its "Set for Success" strategy; Parm Sandhu stepped down from both boards on 30 Sep 2026 | **Not verified** (from the owner's notes; check the filing and Yell's announcements before quoting) |
| Do not confuse with Hartley UK Group Limited (17348445, London, July 2026) or Hartley Farm | From the owner's notes, not checked |

What this changes:
- Hartley is a **Yell-owned product**, and Yell's business is local-business advertising and a trade directory. That explains the trader-matching focus, the commission model, and why Yell Limited receives the contact details.
- Their policy calls Yell Limited a "sub-processor" among suppliers and "companies in our group". Describe it plainly as a **group company**, not an independent supplier.
- Hartley's own site and App Store listing don't mention Yell at all, which is a fair, sourced point about transparency. Phrase it as "Hartley's app listing and website don't name its owner", not as an accusation.
- A loss of about £1.0m (if confirmed) suggests the free model is funded by the parent, with trader referrals as the later revenue line.
- It is a different business from Cuppi: a group-backed lead-generation product against an independent household app. Keep that factual and don't use it as a slur.

## 4. FamilyWall

**Free:** colour-coded shared calendar (import external calendars), shared shopping lists (offline), task lists and chore checklists, recipes (web import), family messenger, photo gallery, contacts directory, multiple private groups ("circles").
**Premium:** budget with category limits, meal planner into shopping list, shared documents (25 GB), schedules and timetable imports, Google and Outlook calendar sync, family locator with arrival and departure alerts, audio and video messages, ad-free. Premium applies to the first 5 circles.

**Price:** UK App Store £5.99/month, £39.99/year, 30-day trial. Their own site and store text show US prices ($4.99 or $7.99 a month, $44.99 a year), so only the UK App Store figures should be quoted.

**Data and tracking:** label lists Identifiers used to track you; linked to you: email, name, user ID, crash data; precise location even in the background. Policy collects Ad ID, IDFA and Google Advertising ID, uses Google Analytics and Firebase, allows ad measurement partners, has a "Your Privacy Choices" link (US opt-out), stores data in the EEA and USA, and says it is not for under-13s.

**Reviews (100 recent):** 60 five-star, 18 one-star. Complaints cluster on crashes (a wave in mid-January 2026), calendars dropping out or not syncing, a subscription state bug with "no way to contact support", a free tier felt limited.

## 4b. Owner's hands-on notes (19 Nov 2026, first-hand, not independently verified)

- **FamilyWall:** tapping almost anything on Free brings up a paywall almost every time, so the free tier feels extremely restricted. It does have a child account. This fits an App Store review from Oct 2025 ("the free option very limited") but is stronger than their own description of free features. Before this goes on the page, repeat it with a fresh account, record the screens and note the date, app version and country.
- **Hartley:** feels technical and like a to-do organiser, with a large to-do list and pushy local-trader suggestions, more than a home app. Two things it does that Cuppi doesn't: subscription and contract tracking, and a document vault. It also uses your data to match you with services, which is both its value and its privacy cost.
- **Ownership: confirmed (see section 3b).** Hartley is controlled by Yell Holdco Limited, the parent of the UK local-directory group Yell. My earlier note that Hartley was "its own company" was wrong, and it is corrected below.
- The page can state these as the owner's experience ("in our testing") but should not present opinion as fact. Design, "pushy" and "feels technical" are judgement, so use them in tone and not in the table.

## 5. Feature matrix

Yes = documented. Blank = none found, not "confirmed absent".

| Feature | Cuppi | Hartley | FamilyWall |
|---|---|---|---|
| Shared household or family space | Yes, with owner, adult and child roles, permissions, ownership transfer | Yes, partner invite | Yes, multiple circles |
| Restricted child accounts | Yes, parent-supervised email and password changes | | Yes (owner confirmed in the app); policy excludes under-13s |
| Private feed or messaging | Home Feed with images, gifts, reactions, links | AI chat only | Messenger, gallery |
| Shared calendar | | Renewal dates only | Yes (free); Google/Outlook sync paid |
| Birthdays, anniversaries, bank holidays, In Memoriam | Yes, all four, plus gift ideas | | Via calendar |
| Shopping lists | Shared, private, live Shopping Mode, auto category sort, list splitting, Siri | | Shared lists, offline |
| Chores and tasks | Yes, starter pack, assignable | Task list, scheduled upkeep | To-dos, chore checklists |
| Pets (vaccines, meds, vet, weight, insurance, microchip, healing) | Yes, full suite | | |
| Budget | Auto-renewing, builder, payday countdown, who-pays splits | | Premium |
| Receipts, itemised, searchable, barcode | Yes, AI digitisation | Documents only | |
| Document vault | | Core feature | Premium |
| Subscription and contract tracking | Partly: budget renewal flags price changes | Yes, reads contracts and tracks end dates | |
| Car: MOT, tax, insurance, DVSA, costs, tyres, warranties | Yes, DVSA-linked | MOT and renewal tracking | |
| Renewal tracking and savings nudges | Budget renewal review | Core feature | |
| Bin day | England councils | | |
| Location sharing | | | Premium |
| Recipes and meal planner | | | Yes / Premium |
| Tradesperson matching | | Yes | |
| AI features | Receipt digitisation, on-device Companion summaries | Chat with documents, photo diagnosis | AI-assistant tie-in in help |
| Siri | 9 shortcuts + iOS 27 schemas | | |
| Notification control | Full, app and marketing separately | In-app marketing preferences | Not checked |
| Support | In-app messaging, 200+ Q&A | Email | Help centre; reviews report no way to contact support |
| Security | Biometrics, 2-step verification, sensitive-activity log, App Attest | Passcode or biometrics, CASA Tier 2 | Not stated |
| Android and web | | Android | Android, web |

## 6. What this means for the comparison page

1. **Strongest, provable edge: no ads, no ad SDKs, no advertising identifiers.** Hartley shares IDFA with Meta, Google and Apple (with consent) and lists User Content as data used to track; FamilyWall carries ads on Free. Cuppi's label has no tracking section. Cite each source, dated.
2. **Breadth is the second edge.** Pets, bin day, UK car (DVSA), itemised receipts, auto-renewing budget and celebrations sit in no rival's feature list. Child-safe household management is the third.
3. **Price: be upfront.** Cuppi Pro is £59.90 a year against £39.99 for FamilyWall Premium and £0 for Hartley. Pair it with the free trial (1 month, 2 with an invite code) and the explanation that both rivals are paid for by ads, tracking or commission.
4. **Do not claim what Cuppi lacks:** calendar, location, document vault, Android. Frame them as different jobs: Hartley is paperwork, FamilyWall is family logistics, Cuppi is the home itself.
5. **iOS 26 is a smaller weakness than it looks:** 84.2% of UK iPhones run it today (section 2b), against about 96.5% for FamilyWall's floor. State it plainly with a date.
5a. **Hartley's two real wins over Cuppi** are the document vault and contract and subscription tracking. Say so. Cuppi's answer is the wider home (pets, bins, car, budget, family), no ads or tracking, and not pushing you toward traders.
5b. **FamilyWall's paywall behaviour** is a strong honest contrast with Cuppi's free tier (which has caps but is usable), once it is verified and dated.
6. **Be careful with the AI line.** Cuppi also uses Gemini for receipts (EU region, separate consent). "No AI" is not a claim Cuppi can make; "no AI on your private data without your say-so" may be.
7. **Fix "Coming soon" first.** The site tags Chores, Shopping and Car that way while the App Store sells them as live.
8. **Legal care:** UK comparative advertising has to be accurate, verifiable and not denigrating. Use neutral wording ("says", "lists"), link every claim to its source, add an "as of" date, and give each rival a fair strengths row. A quick legal read before launch is worth it.

## 7. Still open

- Capturing dated proof (screens, app version) of FamilyWall's paywall prompts on Free, and Hartley's trader suggestions, so the page's claims can be backed up.
- Whether Hartley's data matching can be switched off (the owner's concern that it uses your data to match services).
- Hartley's Android app, and exactly what its free onboarding asks for before showing the app.
- Whether FamilyWall's UK Free tier shows ads in practice (policy and pricing grid say yes; not seen in the app).
- Whether Hartley offers child accounts, or either rival offers per-member notification controls (not found in what was read).
- 1.4.0 (receipt vision engine) is in development, so the page should only describe what version 1.3.1 does until it ships.

## Sources
- Hartley: [App Store](https://apps.apple.com/gb/app/hartley-home-management-app/id6751110777), [site](https://www.hellohartley.co.uk), [how it works](https://www.hellohartley.co.uk/product), [privacy policy](https://www.hellohartley.co.uk/privacy-policy), [terms](https://www.hellohartley.co.uk/terms-conditions)
- FamilyWall: [App Store](https://apps.apple.com/gb/app/familywall-family-organizer/id496889629), [site](https://www.familywall.com), [Premium](https://www.familywall.com/premium.html), [privacy](https://www.familywall.com/privacy.html), [terms](https://www.familywall.com/terms.html), [Premium help article](https://support.familywall.com/en/support/solutions/articles/47001239196-what-is-included-in-familywall-premium-)
- Hartley ownership: Companies House [company](https://find-and-update.company-information.service.gov.uk/company/16471418), [persons with significant control](https://find-and-update.company-information.service.gov.uk/company/16471418/persons-with-significant-control), [officers](https://find-and-update.company-information.service.gov.uk/company/16471418/officers)
- Ownership: [In Tandem launch](https://www.newswire.com/news/ourfamilywizard-launches-new-parent-company-in-tandem-22427670)
- Cuppi: [App Store](https://apps.apple.com/gb/app/cuppi/id6754384902), docs portal (`ios-features`, `learn-ios-08-feature-map`, `backend-subscriptions`, `ios-chores`, `ios-car`, `ios-receipts-v2`, `ios-celebrations`, `ios-siri`, `backlog-security-audit`), `src/lib/features-seed.ts`, and the worldwide iOS-version CSV supplied by the owner.
