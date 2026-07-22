# Roadmap

> **Public and post-launch majors.** Pre-public ship order lives in [`ROADMAP_MINOR.md`](ROADMAP_MINOR.md). Feedback: [`docs/process/FEEDBACK_LOOP.md`](../process/FEEDBACK_LOOP.md). Version rules: [`docs/process/VERSIONING.md`](../process/VERSIONING.md).

## Version scheme (what people expect)

| Range | Meaning |
|---|---|
| **0.x.y** | Pre-public. Unstable; founder / TestFlight only. See minor board. |
| **1.0.0** | **First public** food-logging release (stores). |
| **1.1+** | New product areas after public (workouts, trust, community, …). |
| **2.0** | Paid intelligence (AI photo + AI coach). |

**App today:** **0.2.0**. Continue `0.3.0` … `0.14.0`, then public **`1.0.0`**.

## Founder MVP (done; pre-0.x history)

Scope locked in `MVP_SCOPE.md`. Triage notes → [`ROADMAP_MINOR.md`](ROADMAP_MINOR.md) or [`notes.md`](../../project-context/notes.md).

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

Finish patches in `ROADMAP_MINOR.md` (**v0.1.0 → v0.14.0**), then tag **public `1.0.0`**.

Must include before public: crash monitoring, GDPR account delete + data export, mother catalog, version quality badges + missing-info prompts, full nutrition (fiber, sugars, salt, fats, micronutrients), rule-based report coaching, and the rest of the grouped 0.x board.

**Catalog (ships as v0.11.0):** mothers group versions by barcode; search finds versions; mother name only when browsing. Plan: [`plans/v1.0.8-mother-catalog.md`](plans/v1.0.8-mother-catalog.md).

**Post-launch OK:** fuller unit model per 100 g / 100 ml if not already covered by portion patches.

## v1.0.0 — public launch

- [ ] Pre-public **0.x** board complete
- [ ] Store listing + production auth/emails
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
- [ ] **Photos** on saved meals and on ingredient lines within a meal
- [ ] **Water tracker** (daily intake vs goal)
- [ ] **Daily diary text notes** (free text on the day, e.g. energy / training feel; one notes field per diary day for self-insight and retention)
- [ ] **Meal reminder notifications** (local/push; user-configurable meal times)
- [ ] **Home screen widgets** for iPhone, Pixel, and Samsung (today’s macros / quick add / water as fits platform widgets)
- [ ] **Skippable onboarding tutorial:** walk through profile + short feature tour; always skippable; optional resume from Settings later
- [ ] Quick-log restaurant % macro sliders
- [ ] Personal add-food tab order
- [ ] **Reports:** month and year screens (same day/week pattern: totals, charts, swipe/‹ ›); then custom report periods
- [ ] **Reports IA:** period **Day | Week | Month | Year**; topic row **Nutrition | Fitness | Allergens** (nl: **Voeding | Fitness | Allergieën**). Allergens only when profile allergens set. Fitness when workouts exist (v1.1+). Plan: [`plans/allergen-reports.md`](plans/allergen-reports.md)
- [ ] **Allergen reports** (Allergens topic): safe-grams score, top offenders. **Settings toggle:** whether **kan bevatten / may contain** counts as a hit (personal). Macro charts stay on Nutrition only
- [ ] Workout heatmap

_Note: thin rule-based day/week coaching lines ship in **0.x**; richer period reports stay here._

## v1.4 — community, profile & gamification

Big retention / fun / monetization step.

- [ ] Posts, groups, chat, moderation
- [ ] **Digital profile display:** short bio/text, social links; **avatar** (not a real-life selfie). Start with a **small set of avatar options**; expand cosmetics / variations with the store below
- [ ] Community **badges** (achievements, contribution, milestones) on profiles
- [ ] Reputation for good product/version contributions
- [ ] **Food-logging streaks:** streak counts days the user **logged food** (not mere login). Milestone celebrations + badges. **Streak freezers** (e.g. 1D, 7D) earned from streak progress
- [ ] **Gamification economy:** earn **coins** mainly by logging food, adding to the DB, social posts/chats, liking versions to confirm quality, etc. **In-game store** for avatar items. Optional **buy coins with real money** to support the app (alongside v1.6 Supporter)
- [ ] Life-wheel / XP as fits the above
- [ ] **Recipes** (community): likes and profile popularity; creators visible on version / recipe lists
- [ ] **Duplicate / share meals** in the community (copy into diary or templates)
- [ ] Prices per country (community, optional)

_Note: salt / fiber / sugars / micros ship in **0.x** before public, not here._

## v1.5 — analytics

- [ ] Analytics integration to measure success metrics (`SUCCESS_METRICS.md`) and spot when targets are missed
- [ ] Founder/ops dashboards or exports as needed (privacy-aware; no PII in public docs)

_Note: **crash / error monitoring** (e.g. Sentry) is **v0.1.0**, not this major. Analytics ≠ crash reporting._

## v1.6 — funding & supporter (pay-what-you-want)

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
