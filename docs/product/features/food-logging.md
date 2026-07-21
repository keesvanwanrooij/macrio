# Feature Spec — Food Logging

> v1.0 core feature. Stories: US-10..15, US-20..22.

## Diary structure

- One diary day per calendar date (device timezone).
- Meals: `breakfast`, `lunch`, `dinner` (fixed, ordered) + `snack` meals with an `position` field so snacks can sit between any mains and after dinner. Breakfast always first.
- A log entry = product version reference + portion (grams) + meal + timestamp.

## Adding food

Priority order in the add screen (tabs): **Scan · Search · Recents · Quick add**.

- **Scan:** EAN-8/EAN-13/UPC via camera. Found → portion sheet. Not found → create-product flow (see product spec).
- **Search:** debounced, matches nl + en names, generic entries boosted above brands. Inline allergen badges.
- **Recents:** global across meals, most recent first, deduplicated by product.
- **Quick add:** raw kcal/macros without a product (for restaurant guesses).

## Portions

- Every product: macros per 100 g + zero or more named portions (e.g. "1 burger – 150 g").
- Portion sheet: stepper for count, toggle to raw grams, live macro preview.
- Last-used portion per product is remembered.

## Summaries

- Per meal and per day: kcal, carbs, protein, fat.
- Display modes (user setting, persisted):
  - **Focus:** one macro large, swipe/tap to cycle.
  - **Overview:** all four at a glance.
- Count direction (user setting): up (consumed) or down (remaining vs goal). Without goals, always up.

## Reports

- Day and week totals; week = bar per day + averages. Period picker (this week / last week / custom range v1.1).

## Edge cases

- Editing an entry recalculates totals immediately.
- Deleting a product version that is logged: log entries keep a snapshot of macros at log time (denormalized) so history never changes retroactively.
- Offline: v1.0 requires connectivity; show a friendly offline state. Offline-first is on the roadmap (`docs/architecture/OFFLINE_SYNC.md`).
