# Roadmap

> **Public and post-launch majors.** Pre-public ship order lives in [`ROADMAP_MINOR.md`](ROADMAP_MINOR.md). Feedback: [`docs/process/FEEDBACK_LOOP.md`](../process/FEEDBACK_LOOP.md). Version rules: [`docs/process/VERSIONING.md`](../process/VERSIONING.md).

## Version scheme (what people expect)

| Range | Meaning |
|---|---|
| **0.x.y** | Pre-public. Unstable; founder / TestFlight only. See minor board (includes analytics + auth abuse before public). |
| **1.0.0** | **First public** food-logging release (stores). |
| **1.1+** | New product areas after public (workouts, trust, community, funding, …). |
| **2.0** | Paid intelligence (AI photo + AI coach). |

**App today:** **0.2.0**. Continue `0.3.0` … `0.16.0`, then public **`1.0.0`**.

## Founder MVP (done; pre-0.x history)

Scope locked in `MVP_SCOPE.md`. Triage notes → [`ROADMAP_MINOR.md`](ROADMAP_MINOR.md) or [`notes.md`](../founder/notes.md).

**Built during founder testing (formerly called “1.0.0 testing”):**

- [x] Diary: meals/snacks, date nav, edit/delete entries
- [x] Scan → DB → Open Food Facts → create product
- [x] Search, recents, quick add
- [x] Product versions, likes, reports, suggest edit
- [x] EU-14 allergens (honest unknown), nl/en
- [x] Count up/down, macro focus/overview, day/week reports
- [x] Onboarding (allergens + goals), email auth, profiles
- [x] In-app feedback + Settings
- [x] Supabase schema, RLS, seed data

## Pre-public (0.x) — then public 1.0.0

Finish patches in `ROADMAP_MINOR.md` (**v0.1.0 → v0.16.0**), then tag **public `1.0.0`**.

Must include before public: crash monitoring, GDPR account delete + data export, mother catalog, version quality badges + missing-info prompts, full nutrition (fiber, sugars, salt, fats, micronutrients), rule-based report coaching, **analytics + password-reset abuse ops (v0.15.0)**, **halal + vegan diet pills (v0.16.0)**, **quality admin staple seed** (correct macros, micros, EU-14 allergens, and diet labels where known - see minor board v0.11 / v0.14 / v0.16), and the rest of the grouped 0.x board.

**Catalog (ships as v0.11.0):** mothers group versions by barcode; search finds versions; mother name only when browsing. **Admin seed** under a reserved account must be high-quality catalog data (macros + allergens at seed time; micros + halal/vegan when those fields exist). Plan: [`plans/v0.11.0-mother-catalog.md`](plans/v0.11.0-mother-catalog.md).

**Post-launch OK:** fuller unit model per 100 g / 100 ml if not already covered by portion patches.

## v1.0.0 — public launch

- [ ] Pre-public **0.x** board complete (through **v0.16.0** diet labels)
- [ ] Store listing (EAS production builds, screenshots, nl/en store text)
- [ ] **Hosting + landing (macrio.nl / macrio.app):** buy hosting; ship a simple HTTPS landing (privacy, store links). This URL becomes the real **Supabase Site URL** and confirm-email browser target. Domains already owned.
- [ ] **Custom SMTP in Supabase:** project mail from your domain (e.g. `noreply@macrio.nl`) via hosting/mail provider. Confirm + reset must not rely on Supabase’s built-in founder mail. Dashboard: Project Settings → Authentication → SMTP.
- [ ] **Production Auth URLs (must be correct before public users):**
  - **Site URL:** production `https://…` on macrio.nl or macrio.app (no wildcards; **not** `localhost:3000`)
  - **Redirect URLs allow-list:** that same `https://…` (and paths if needed) + **`macrio://**`** for store / EAS builds. Remove founder-only `http://localhost:3000` and drop **`exp://**`** unless you still use Expo Go for debugging
  - **App env:** production `EXPO_PUBLIC_AUTH_REDIRECT_URL` = that HTTPS Site URL (must match dashboard)
  - **Password reset / confirm deep links:** store builds use scheme **`macrio`** (`Linking.createURL` / `macrio://…/auth/callback`). Root app must exchange the email `code` and **force** the set-password screen (do not send onboarded users straight to tabs). Do **not** ship relying on Expo Go LAN IPs (`exp://192.168.…`) - Supabase rejects those and falls back to Site URL. Verify on a **real store or preview build**: forgot password → open mail on phone → **New password** screen → save → sign in
  - **Confirm email:** leave **ON**
  - Paste branded templates still current (`backend/supabase/email-templates/`)
  - Optional hardening: WebCrypto / `expo-crypto` so PKCE uses sha256 (avoid “plain” code challenge warnings on RN)
  - Smoke: new signup confirm + forgot-password end-to-end on phone
  - Details: `SETUP.md` step 16+, `RELEASE_CHECKLIST.md`, `docs/founder/supabase-v0.2.0-auth-setup.md`
- [ ] Confirm **v0.15.0** analytics + forgot-password abuse controls are live before opening stores (see minor board)
- [ ] Confirm **v0.16.0** halal + vegan pills + profile diet prefs are live before opening stores (see minor board)
- [ ] Confirm **quality admin staple seed** is loaded: macros, micros, EU-14 allergens, halal, vegan correct where known (unknown only when honest)
- [ ] **In-app store review prompt:** after about **7 days** of real use (e.g. days with food logged, not just install), ask once for App Store / Play review via the platform review API; respect OS limits; never nag; easy dismiss
- [ ] Tag `v1.0.0` and open to the public
- [ ] **Sentry account:** start signup/trial around launch (not earlier - avoid burning the trial during quiet founder testing). Wire `EXPO_PUBLIC_SENTRY_DSN` in production env; confirm smoke/test event. SDK already shipped in **v0.1.0** (`SETUP.md`)

## v1.1 — workout builder & tracker

- [ ] Unlimited workouts
- [ ] Hevy-style logging (sets, kg, reps, PRs)
- [ ] Pre-filled + custom exercises (community likes)
- [ ] Body metrics menu (weight, fat %, photos)

## v1.2 — trust, versions & governance

- [ ] Weighted trust graph; community report voting
- [ ] **Version hygiene (deeper):** scheduled trim/archive of old unused low-like versions beyond the per-owner cap (soft-delete first; hard purge only when safe)
- [ ] **Version ownership (edit window):** owner may edit in place for **30 days** after creation; after 30 days an edit forks a **new version** that **copies likes** so both stay; users can unlike the new one and the old top version can rise again. Applies to public and private **versions** (subject to max 3 per owner per mother)
- [ ] **Duplicate from any version:** pick e.g. v2 as base while current is v5 → create v6 (not only prefill from most-liked)
- [ ] Product page: show **version owner name and/or date** instead of bare “version N”, respecting profile privacy / visibility
- [ ] **Profile community visibility slider** (private → balanced → public): e.g. show username + profile link on versions / meals as incentive for good contributions
- [ ] **Admin role expansion:** more than founder can rename mothers, reserve usernames, and clean catalog; optional majority-agree merge UI for hard duplicate cases the barcode link path cannot fix
- [ ] **Health sync** (Health Connect, HealthKit, Samsung): read body weight (kg) and related metrics the user allows
- [ ] **Goals from health weight + g/kg sliders:** after health sync supplies weight, optionally auto-calculate daily **kcal target** and macros from protein/fat **g/kg** sliders; **carbs fill the remaining kcal**. User can still override manually. Builds on the pre-public g/kg slider UX (`ROADMAP_MINOR` v0.4.0)

_Note: catalog visibility on **versions** and mother/barcode model ship in **0.x** (see minor board)._

## v1.3 — planning & personalization

- [ ] Meal planning
- [ ] Save / load / modify **personal** complete meals (templates; planner integration); meals **public or private** (same idea as ingredient/version visibility)
- [ ] ~~**Photos** on saved meals and on ingredient lines~~ → **deferred** (Supabase storage budget). Scratchpad: `docs/context/storage-photos.md`. Product create no longer uploads community photos; OFF remote URLs may still display. Feedback keeps **one** screenshot.
- [ ] **Water tracker** (daily intake vs goal)
- [ ] **Daily diary text notes** (free text on the day, e.g. energy / training feel; one notes field per diary day for self-insight and retention)
- [ ] **Meal reminder notifications** (local/push; user-configurable meal times)
- [ ] **Home screen widgets** for iPhone, Pixel, and Samsung (today’s macros / quick add / water as fits platform widgets)
- [ ] **Skippable onboarding tutorial:** walk through profile + short feature tour; always skippable; optional resume from Settings later
- [ ] Quick-log restaurant % macro sliders
- [ ] Personal add-food tab order
- [ ] **Units preference:** metric (default) vs imperial / US customary for weight and related displays (lb, oz, fl oz as fits); optional kJ alongside or instead of kcal if cheap. Same Settings preferences pattern as date format (**v0.3.0**). Diary snapshots stay unambiguous (store metric + convert for display, or store display unit with care).
- [ ] **Reports:** month and year screens (same day/week pattern: totals, charts, swipe/‹ ›); then custom report periods
- [ ] **Reports IA:** period **Day | Week | Month | Year**; topic row **Nutrition | Fitness | Allergens** (nl: **Voeding | Fitness | Allergieën**). Allergens only when profile allergens set. Fitness when workouts exist (v1.1+). Plan: [`plans/allergen-reports.md`](plans/allergen-reports.md)
- [ ] **Allergen reports** (Allergens topic): safe-grams score, top offenders. **Settings toggle:** whether **kan bevatten / may contain** counts as a hit (personal). Macro charts stay on Nutrition only
- [ ] Workout heatmap

_Note: thin rule-based day/week coaching lines ship in **0.x**; richer period reports stay here._

## v1.4 — community, profile & gamification

Big retention / fun / monetization step.

- [ ] **Refer a friend:** share invite / referral from Settings or profile (link or code); light reward TBD (coins in v1.4 economy, or simple thank-you). Keep core free; no dark patterns
- [ ] Posts, groups, chat, moderation
- [ ] **Digital profile display:** short bio/text, social links; **pet avatar** (not a selfie). The avatar is the user’s **pet**: customize with **coins**; **body / mood** reflects how they eat (good logging / balanced food → healthier happier pet; poor patterns → unhappy / out-of-shape look). Start with a small set of pets + cosmetics; expand via the store below. Scratchpad: `docs/context/pet-avatar.md`
- [ ] Community **badges** (achievements, contribution, milestones) on profiles
- [ ] Reputation for good product/version contributions
- [ ] **Food-logging streaks:** streak counts days the user **logged food** (not mere login). Milestone celebrations + badges. **Streak freezers** (e.g. 1D, 7D) earned from streak progress
- [ ] **Gamification economy:** earn **coins** mainly by logging food, adding to the DB, social posts/chats, liking versions to confirm quality, etc. **In-game store** for **pet** cosmetics / outfits. Optional **buy coins with real money** to support the app (alongside v1.5 Supporter)
- [ ] Life-wheel / XP as fits the above
- [ ] **Recipes** (community): likes and profile popularity; creators visible on version / recipe lists
- [ ] **Duplicate / share meals** in the community (copy into diary or templates)
- [ ] Prices per country (community, optional)
- [ ] **Themed seasonal events** (limited-time community campaigns): e.g. Christmas, Halloween, New Year, Easter, summer / back-to-school. Event-specific avatar cosmetics or badges in the store, themed challenges (logging / sharing meals / contributing products), optional community posts or groups for the season. Keep opt-in and light; no pressure to buy. Calendar can expand later (local holidays, brand moments)

_Note: salt / fiber / sugars / micros ship in **0.x** before public, not here._

## v1.5 — funding & supporter (pay-what-you-want)

Spirit: only ask people who **enjoy Macrio long-term**; they set the price based on value and what they can spare. Core app stays free.

- [ ] **In-app notice** (not push): ~**4 times per year**, scheduled on a **random interval between 2 and 4 months** so messages spread out across users
- [ ] Content: comparison table vs paid apps (e.g. MyFitnessPal, FatSecret, Yazio) - what they charge for vs what Macrio offers free
- [ ] CTA: upgrade from free → **Supporter**; user sets monthly amount (even **€1**/month), framed against typical competitor monthly prices
- [ ] **One-time donation** button alongside subscription
- [ ] **Supporter** active → no funding notices
- [ ] **One-time donor** → mute notices for **6 months**
- [ ] Payments/backend TBD (e.g. Stripe / RevenueCat / GitHub Sponsors bridge); Settings “Support the project” remains the always-available path
- [ ] Coin packs (from v1.4 store) can share the same payments stack when ready

## v2.0 — intelligence (paid)

- [ ] **AI photo meal logging** (paid)
- [ ] **AI coach** (paid): personalized guidance beyond the free rule-based report lines from 0.x
