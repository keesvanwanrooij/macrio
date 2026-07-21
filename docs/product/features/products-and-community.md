# Feature Spec — Products, Versions & Community Layer (simple)

> v1.0. Stories: US-11, US-40, US-41. Full trust graph: v1.2 (`docs/architecture/TRUST_GRAPH.md`).

## Product model

- Identity: barcode (nullable for generic foods) + name (nl/en) + brand (nullable) + photo.
- Nutrition: kcal, carbs, protein, fat per 100 g (v1.0 keeps only these four; micros later).
- Portions: named portions with gram weight.
- Allergens: per EU-14 allergen, one of `contains` / `free` / `unknown` (default unknown).
- Source: `openfoodfacts` (seed) or `community` (user-created).

## Versioning

- Products are immutable versions; an edit creates a new version linked to the same product.
- Default shown version = most likes (ties: newest). Version history browsable.
- One like per user per version. Likes are the v1.0 stand-in for trust weighting.
- Log entries snapshot macros at log time, so later versions never rewrite history.

## Creation flow (barcode not found or manual)

Required: name, 4 macros per 100 g.
Prefilled: one portion "1 portie – 100 g" (name and grams editable — never a 1-gram default).
Optional: brand, photo (camera/gallery, stored in Supabase Storage), allergen tags, barcode.
On save: product is public immediately and logged for the creator in one action.

## Reporting

- Report button with reason (wrong macros / wrong allergens / spam / duplicate / other).
- v1.0: reports accumulate in a moderation queue table; no automated action yet.
- v1.2: community majority voting resolves reports (delete/keep), weighted by trust graph.

## Seed import (Open Food Facts)

- Import script in `backend/supabase/seed/` filtered to NL + EN market products with complete macro data.
- Map OFF allergen tags → EU-14 fields; missing tag = `unknown` (never assume `free`).
- Attribution: "Powered in part by Open Food Facts" in app about screen (ODbL requirement).
- Imported entries become version 1 of their product, source `openfoodfacts`.
