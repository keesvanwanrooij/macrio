# ADR-003: Open Food Facts as seed database

- Status: accepted · 2026-07-21

## Context

Options: start empty (pure community), Open Food Facts (OFF), and/or NEVO (Dutch national food database).

## Decision

Seed v1.0 from **Open Food Facts only**. Evaluate NEVO later, only after its license terms for redistribution are verified.

## Reasons

1. OFF is openly licensed (ODbL), has barcodes (our core flow), allergen tags (our core USP), and NL+EN product coverage.
2. Starting empty makes the first-week experience terrible ("not found" on every scan) — the market research shows tiny databases are the #1 gluten-app complaint.
3. NEVO is authoritative for Dutch generic foods but its redistribution license needs checking; deferring avoids legal risk in the one-session MVP.

## Implementation notes

- Import script filtered to NL/EN market products with complete macro data (kcal, carbs, protein, fat per 100 g).
- OFF allergen tags map to our EU-14 fields; missing data = `unknown`, never `free`.
- ODbL obligations: in-app attribution + share-alike on database redistribution (see `docs/product/LEGAL.md`).
- Community contributions layer on top as new products/versions (ToS keeps them ODbL-compatible).

## Consequences

- Generic Dutch staples ("aardappel, gekookt") may be underrepresented until NEVO or community fills the gap; the create-product flow is the pressure valve.
