# Feature Spec — Allergen Awareness

> v1.0. Story: US-30. Differentiator #1.

## The EU-14 allergens

Gluten, crustaceans, eggs, fish, peanuts, soybeans, milk (lactose), tree nuts, celery, mustard, sesame, sulphites, lupin, molluscs.

Dutch labels in `docs/i18n/GLOSSARY.md`.

## User side

- During onboarding (and in settings): multi-select "my allergens" (0..14).
- Gluten is the flagship use case but all 14 are equal in the data model and UI.

## Display rules

For each product, per allergen: `contains` / `free` / `unknown`.

- Search results and recents: compact badge only for the user's selected allergens — red (contains), green (free), grey (unknown).
- Product page: full allergen table for all 14, user's allergens pinned on top.
- Diary entries: red badge if a logged product contains a selected allergen.
- **Honesty rule:** absence of data is always `unknown`, never `free`. No guessing from ingredient text in v1.0.
- Disclaimer footer on product pages and at allergen selection (text in `LEGAL.md`).

## Data sources

- Open Food Facts allergen tags on seeded products.
- Community-set tags on created/edited products (versioned like all product data).
- v1.2+: trust-graph confidence score per allergen claim.
