# Roadmap

> **Major versions only.** Patch ship order and checkboxes live in [`ROADMAP_MINOR.md`](ROADMAP_MINOR.md) (reorder freely as priorities change). Feedback cycle: [`docs/process/FEEDBACK_LOOP.md`](../process/FEEDBACK_LOOP.md).

**App version:** **1.0.0** (founder testing). Bump only when a full patch ships (`docs/process/VERSIONING.md`).

## v1.0 — MVP — food logging

Scope locked in `MVP_SCOPE.md`. Triage founder notes → [`ROADMAP_MINOR.md`](ROADMAP_MINOR.md) or [`notes.md`](../../project-context/notes.md).

**Shipped in 1.0.0 (founder testing):**

- [x] Diary: meals/snacks, date nav, edit/delete entries
- [x] Scan → DB → Open Food Facts → create product
- [x] Search, recents, quick add
- [x] Product versions, likes, reports, suggest edit
- [x] EU-14 allergens (honest unknown), nl/en
- [x] Count up/down, macro focus/overview, day/week reports
- [x] Onboarding (allergens + goals), email auth, profiles
- [x] In-app feedback + Settings
- [x] Supabase schema, RLS, seed data

**Pre-public polish:** finish planned patches in `ROADMAP_MINOR.md` (currently through **v1.0.10**), then public launch. Detail and order change there, not in this file.

**Post-launch OK:** full unit model per 100 g or 100 ml (beyond simple g/ml portion labels).

## v1.1 — workout builder & tracker

- [ ] Unlimited workouts
- [ ] Hevy-style logging (sets, kg, reps, PRs)
- [ ] Pre-filled + custom exercises (community likes)
- [ ] Body metrics menu (weight, fat %, photos)

## v1.2 — trust, versions & governance

- [ ] Weighted trust graph; community report voting
- [ ] Version hygiene (trim/archive low-like old versions)
- [ ] **Version ownership:** each version has an owner; owner may edit in place for **30 days** after creation; after 30 days an edit forks a **new version** that **copies likes** so both stay; users can unlike the new one and the old top version can rise again. Same rule for public and private products.
- [ ] **Duplicate from any version:** pick e.g. v2 as base while current is v5 → create v6 (not only prefill from most-liked)
- [ ] Product page: show **owner name and/or date** instead of bare “version N”, respecting profile privacy / visibility
- [ ] **Profile community visibility slider** (private → balanced → public): e.g. show username + profile link on versions / meals as incentive for good contributions
- [ ] **Product merge (admin governance):** duplicate catalog entries are common; **admin** role; merge when a **majority of admins** agree (founder should not need a part-time job moderating merges alone)
- [ ] Health sync (Health Connect, HealthKit, Samsung)

_Note: catalog `products.visibility` public|private (create checkbox, owner toggle, RLS) shipped during 1.0.0 testing (migration 013)._

## v1.3 — planning & personalization

- [ ] Meal planning
- [ ] Save / load / modify **personal** complete meals (templates for the user; planner integration)
- [ ] **Skippable onboarding tutorial:** walk through filling profile details (body, goals, allergens as needed) and a short tour of main features; always skippable so the user can use the app immediately; optional resume from Settings later
- [ ] Quick-log restaurant % macro sliders
- [ ] Personal add-food tab order
- [ ] **Reports:** month and year screens (same day/week pattern: totals, charts, swipe/‹ ›); then custom report periods
- [ ] **Reports IA:** keep period switcher **Day | Week | Month | Year**; add a second row under it for **topic**: **Nutrition | Fitness | Allergens** (nl: **Voeding | Fitness | Allergieën**). Allergens only when `profile.allergens.length > 0`. Fitness when workouts exist (v1.1+); until then Nutrition (+ Allergens if set). Plan: [`plans/allergen-reports.md`](plans/allergen-reports.md)
- [ ] **Allergen reports** (Nutrition period + Allergens topic): safe-grams score (total + per allergen, Toon alles), top offenders (times + grams). Macro charts stay on Nutrition only
- [ ] Workout heatmap

## v1.4 — community

- [ ] Posts, groups, chat, moderation
- [ ] Profiles (XP, badges, life-wheel); reputation for good product/version contributions
- [ ] **Recipes** (community): likes and profile popularity matter; creators visible on version / recipe lists
- [ ] **Duplicate / share meals** in the community (copy someone else’s meal into your diary or templates)
- [ ] **Salt and other micronutrients** in DB + tracker (seed + verify after community integrations are in place)
- [ ] Prices per country (community, optional)

## v1.5 — analytics

- [ ] Analytics integration to measure success metrics (`SUCCESS_METRICS.md`) and spot when targets are missed
- [ ] Founder/ops dashboards or exports as needed (privacy-aware; no PII in public docs)

## v1.6 — funding & supporter (pay-what-you-want)

Spirit: only ask people who **enjoy Macrio long-term**; they set the price based on value and what they can spare. Core app stays free.

- [ ] **In-app notice** (not push): ~**4 times per year**, scheduled on a **random interval between 2 and 4 months** so messages spread out across users
- [ ] Content: comparison table vs paid apps (e.g. MyFitnessPal, FatSecret, Yazio) - what they charge for vs what Macrio offers free
- [ ] CTA: upgrade from free → **Supporter**; user sets monthly amount (even **€1**/month), framed against typical competitor monthly prices
- [ ] **One-time donation** button alongside subscription
- [ ] **Supporter** active → no funding notices
- [ ] **One-time donor** → mute notices for **6 months**
- [ ] Payments/backend TBD (e.g. Stripe / RevenueCat / GitHub Sponsors bridge); Settings “Support the project” remains the always-available path

## v2.x — intelligence (paid)

- [ ] AI photo meal logging (only planned paid feature)
