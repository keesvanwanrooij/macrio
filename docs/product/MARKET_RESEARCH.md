# Market Research

> Status: v0.1 — combines founder experience with online review analysis (July 2026).

## Key findings from online review analysis

### Calorie trackers (2026)

- **MyFitnessPal:** April 2026 UI redesign (v26.16.0) replaced the Diary tab and crashed the app rating from 3.24 to 1.54 stars; users report more taps for core logging and loss of copy-item-between-meals. May 2026 paywall expansion moved scan-a-meal, recipe import, and per-meal macro goals to Premium ($79.99/yr). Barcode scanning has been Premium since 2022 — still the loudest complaint in the category. Database rot: "cheeseburger" returns 200+ entries with wildly varying macros.
- **Industry pattern:** "free forever" apps pivot to subscription-only; long-time users feel betrayed ("slow betrayal" is the recurring phrase in 1-star reviews). Cronometer and Lose It! score better on trust because they were never free-then-paywalled.
- **Yazio:** billing friction, unclear auto-renewal, EU-skewed database.
- **Lifesum:** 2025 AI-first logging interface is error-prone (misidentified foods, sync failures).

### Gluten-free scanner apps

- Databases are tiny (users report 2/30 scans found) and unverified: certified GF products flagged as containing gluten and vice versa (e.g. Frosted Flakes with malt flavoring reported as gluten-free).
- Reviewers explicitly ask for: verified/trust-weighted community data, personal accounts, regional coverage, and honesty about cross-contamination.
- Paid upgrades don't fix the underlying data problem — validating our community trust-graph approach.
- What works well (to copy): contribute-to-database flows, restaurant/travel cards, "quiz-guided" reviews that improve rating accuracy.

## Founder experience per app

### Eetmeter
- ✅ Detailed reports per day/week/period.
- ❌ Only one macro visible at a time → we need toggle: focus on one OR all four (kcal, carbs, protein, fat) at a glance.
- ❌ Many ingredients missing; too many near-duplicate choices ("groente", "apple") → need "approximately correct" generic entries ranked first.
- ❌ Product creation painful, portion defaults to 1 gram → we default to natural portions ("1 burger = 150 g").
- ❌ No recent products.

### FatSecret
- ✅ Fundamentally solid.
- ❌ Recents are per-meal, not global → our recents are global across meals.

### MyFitnessPal
- ❌ Counts macros down; we make count-up vs count-down a user setting.
- ✅ Snacks between meals → our structure: breakfast → lunch → dinner fixed order, unlimited snack meals between and after.

### Yazio
- ✅ Onboarding questionnaire builds a customized plan → we make it optional.
- ❌ Fully premium, quality doesn't justify price.

### Strong
- ✅ Excellent workout builder/planner.
- ❌ Free tier caps at 3 workouts → ours is unlimited, which is a founding motivation.

### Lifesum
- ✅ AI photo calorie counting (our roadmap: paid feature).
- ✅ Life-wheel concept (scores across life areas).

### Hevy
- ✅ Body weight / fat % / muscle kg as standalone menu item.
- ✅ Progress pictures over time.
- ✅ PRs celebrated.
- ✅ Simple workout screen: sets, previous, kg, reps, completion check → adopt this layout.

## Data sources to evaluate

- **Open Food Facts** — open license, barcodes, allergen tags incl. gluten. Primary seed.
- **NEVO** (RIVM Dutch national food database) — authoritative Dutch generic foods. Check license terms for redistribution.
