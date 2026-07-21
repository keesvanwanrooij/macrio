# Roadmap

> Major.minor versions planned per community feedback cycle (`docs/process/FEEDBACK_LOOP.md`). Order below is the plan; feedback can reshuffle minors.

## v1.0 — MVP (one build session) — food logging

Scope locked in `MVP_SCOPE.md`: diary with flexible meals/snacks, barcode scan, painless product creation, EU-14 allergen display, product versions + likes + reports, nl/en, count up/down, macro focus/overview, day/week reports, in-app feedback, Open Food Facts seed.

**Known gap (v1.0.1):** portions are grams-only in UI; liquids need ml labels — see `ROADMAP_MINOR.md`.

## v1.0.x — food logging polish (patches)

- **v1.0.1:** Portion units g/ml (display + seed) — see `ROADMAP_MINOR.md`.
- **Later patch:** Full unit model — product-level reference unit, nutrition per 100 g *or* 100 ml, unit picker in create-product, Open Food Facts per-100ml import (needed for oils and accurate liquid macros).

## v1.1 — workout builder & tracker

- Unlimited workouts (no 3-workout cap like Strong).
- Hevy-style logging screen: sets, previous, kg, reps, completion check.
- PR detection and celebration.
- Pre-filled popular exercises; custom exercises shared with community (likes).
- Body metrics standalone menu: weight, fat %, muscle kg, progress photos.

## v1.2 — trust & connections

- Weighted trust graph replaces raw likes; community voting resolves reports (data governance live).
- Health sync: Google Health Connect, Apple HealthKit, Samsung Health (requires dev-client builds).
- NEVO import if license verified.



## v1.3 — planning & personalization

- Meal planning.
- Optional onboarding questionnaire (Yazio-style) for goal suggestions.
- Custom report periods; muscle-intensity body heatmap for workouts.



## v1.4 — community

- Public posts + reactions; groups with admins; chat channels.
- Democratic moderation (progressive mutes/timeouts, monthly weight recalibration, permanent record).
- Profiles: progress, goals, trust stats, XP/levels/badges; community-pinned YouTube tutorials per exercise; life-wheel.



## v2.x — intelligence (paid)

- AI photo meal logging (portion + macro estimation) — the only planned paid feature, funding infrastructure costs.

