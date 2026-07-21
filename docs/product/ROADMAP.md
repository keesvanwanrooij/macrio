# Roadmap

> Major.minor versions planned per community feedback cycle (`docs/process/FEEDBACK_LOOP.md`). Order below is the plan; feedback can reshuffle minors.

## v1.0 — MVP (one build session) — food logging

Scope locked in `MVP_SCOPE.md`: diary with flexible meals/snacks, barcode scan, painless product creation, EU-14 allergen display, product versions + likes + reports, nl/en, count up/down, macro focus/overview, day/week reports, in-app feedback, Open Food Facts seed.

**Pre-public polish:** founder food needs ship as patches **v1.0.1 → v1.0.8** in `ROADMAP_MINOR.md`, then public launch and community feedback. Do not open the floodgates until the parent-catalog base seed (v1.0.8) is in place.

## v1.0.x — food logging polish (patches)

Ship order and detail: `ROADMAP_MINOR.md`. Working plans: [`plans/`](plans/README.md).

- **v1.0.1:** Portion units g/ml + default custom amount 100 g (ml when unit is ml); fractional portion counts (e.g. 0.5 × pack). [plan](plans/v1.0.1-portion-units.md)
- **v1.0.2:** Email confirmation for production + Macrio-branded auth emails + forgot password. [plan](plans/v1.0.2-auth-emails.md)
- **v1.0.3:** Settings: edit username, app version, DOB calendar picker, date-format setting. [plan](plans/v1.0.3-settings-identity.md)
- **v1.0.4:** Onboarding/goals: calculator behind a button, “Niets/Nothing” allergens, soft body validation, macro autocomplete + kcal equivalents. [plan](plans/v1.0.4-onboarding-goals.md)
- **v1.0.5:** Diary: per-meal macro totals + progress toward daily goals. [plan](plans/v1.0.5-diary-progress.md)
- **v1.0.6:** Named portions (e.g. small / medium / large). [plan](plans/v1.0.6-named-portions.md)
- **v1.0.7:** Cook state on products/versions: `cooked` | `uncooked` | `not_applicable` (rice, meat, pasta, etc.). [plan](plans/v1.0.7-cook-state.md)
- **v1.0.8:** Locked parent foods + Dutch ~80% staple parent seed (pre-launch). [plan](plans/v1.0.8-parent-catalog.md) · [pitch](../../project-context/parent-food-catalog-pitch.md)
- **Later patch (post-launch OK):** Full unit model — product-level reference unit, nutrition per 100 g *or* 100 ml, unit picker in create-product, Open Food Facts per-100ml import (needed for oils and accurate liquid macros).

## v1.1 — workout builder & tracker

- Unlimited workouts (no 3-workout cap like Strong).
- Hevy-style logging screen: sets, previous, kg, reps, completion check.
- PR detection and celebration.
- Pre-filled popular exercises; custom exercises shared with community (likes).
- Body metrics standalone menu: weight, fat %, muscle kg, progress photos.

## v1.2 — trust & connections

- Weighted trust graph replaces raw likes; community voting resolves reports (data governance live).
- **Version hygiene:** when a product has too many versions above a threshold, periodically trim or archive older low-like versions (keep history honest; prefer archive over hard-delete where diary snapshots need it).
- Health sync: Google Health Connect, Apple HealthKit, Samsung Health (requires dev-client builds).



## v1.3 — planning & personalization

- Meal planning.
- Optional onboarding questionnaire (Yazio-style) for goal suggestions. (v1.0 ships a lighter Mifflin-St Jeor calculator in onboarding/settings; full questionnaire stays here.)
- **Quick-log restaurant meals:** enter grams (or ml), linked % sliders for carbs/protein/fat that stay at 100%, show kcal per macro gram, auto-calc totals — better guessing for restaurant plates.
- **Personal add-food tab order:** track per-user use of scan / search / recent / quick-log; show the header in that personal order.
- Custom report periods; muscle-intensity body heatmap for workouts.



## v1.4 — community

- Public posts + reactions; groups with admins; chat channels.
- Democratic moderation (progressive mutes/timeouts, monthly weight recalibration, permanent record).
- Profiles: progress, goals, trust stats, XP/levels/badges; community-pinned YouTube tutorials per exercise; life-wheel.
- **Prices per country (community):** optional price (and unit, e.g. €/kg or €/pack) on products/versions, tagged by country (start NL). Community-submitted, timestamped, never required to log food. Useful for comparing staples vs brand SKUs; not a shopping engine in v1.4.



## v2.x — intelligence (paid)

- AI photo meal logging (portion + macro estimation) — the only planned paid feature, funding infrastructure costs.
