# ADR-003: Open Food Facts as seed database

- Status: accepted · 2026-07-21 (amended: NEVO dropped as a database goal)

## Context

Options considered: start empty (pure community), Open Food Facts (OFF), and/or NEVO (Dutch national food database).

## Decision

Seed and grow the food database from **Open Food Facts** plus **community contributions** and Macrio’s own **parent/staple seed** (see `ROADMAP_MINOR.md` v1.0.8). **NEVO is not a planned import or database goal.**

## Reasons

1. OFF is openly licensed (ODbL), has barcodes (our core flow), allergen tags (our core USP), and NL+EN product coverage.
2. Starting empty makes the first-week experience terrible ("not found" on every scan) — the market research shows tiny databases are the #1 gluten-app complaint.
3. NEVO redistribution license risk and maintenance cost are not worth a second national DB pipeline; Dutch generics are covered by curated parent seed + community versions instead.

## Implementation notes

- Import script filtered to NL/EN market products with complete macro data (kcal, carbs, protein, fat per 100 g).
- OFF allergen tags map to our EU-14 fields; missing data = `unknown`, never `free`.
- ODbL obligations: in-app attribution + share-alike on database redistribution (see `docs/product/LEGAL.md`).
- Community contributions layer on top as new products/versions (ToS keeps them ODbL-compatible).

## Consequences

- Generic Dutch staples ("aardappel, gekookt") rely on Macrio parent seed and community create-product — not a third-party national DB import.
