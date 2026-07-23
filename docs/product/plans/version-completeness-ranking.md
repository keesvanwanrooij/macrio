# Plan: Version completeness ranking (likes tie-break)

| Field | Value |
|---|---|
| Status | Draft |
| Roadmap | [`ROADMAP_MINOR.md`](../ROADMAP_MINOR.md) → ship helper with **v0.7.0** (diary QoL); extend weights in **v0.10.0** when cook lands |
| Depends on | Product versions, likes; cook_state (ships as v0.10.0) for cook points |
| Related | [`v0.7.0-diary-search-qol.md`](v0.7.0-diary-search-qol.md) (ships as v0.7.0), [`v0.10.0-cook-state.md`](v0.10.0-cook-state.md) (ships as v0.10.0), `current_product_versions` |

## Problem

Default version = most likes, ties → newest. Equal likes often leave a sparse version (all allergens `unknown`, no cook declaration) above a richer one. Users want **richer data** to win ties without beating community likes.

## Goal

Stable sort everywhere versions are ranked:

1. **`like_count` DESC** (always primary)
2. **`completeness_score` DESC** (tie-break)
3. **`created_at` DESC** (newest)
4. On **log-entry only** (v1.0.10): prefer **last version this user logged** for that product when available (personal override; does not change catalog default)

Do **not** hide sparse versions; reorder only. Do **not** let richness beat likes.

## Completeness score

Pure function `versionCompletenessScore(version)` (shared TS helper first; same formula later in SQL view or denormalized column).

| Signal | Points | When |
|---|---|---|
| Each allergen key with state `contains` or `free` (not omitted/`unknown`) | +1 each (max 14) | v1.0.10 |
| `cook_state` in `not_applicable` \| `cooked` \| `uncooked` | +2 | v1.0.7 |
| `cook_state = both` **and** alt macro block filled | +4 | v1.0.7 |
| Photo present | +1 (optional) | if cheap to include |
| At least one named portion other than bare 100 g default | +1 (optional) | if useful |

Weights stay small and documented so contributors understand why v3 beats v2 at equal likes.

### Example

- A: 5 likes, 0 allergens set, no cook → score 0  
- B: 5 likes, 8 allergens set, `both` with alt macros → score 8 + 4 = 12 → **B wins**  
- C: 6 likes, empty allergens → **C wins** (likes first)

## Where it applies

- Product page version list
- Default / “current” version (`current_product_versions` and any client fallback)
- Log-entry version picker (plus personal last-used preference)

## Implementation approach

### With v1.0.10 (do first)

- [ ] Add `versionCompletenessScore` in `app/src/lib/` (allergens only + optional photo/portion)
- [ ] Sort product versions and log-entry picker: likes → score → newest
- [ ] Align client default-version pick with the same order
- [ ] Document formula in code comment (WHAT/HOW) + this plan

### With v1.0.7 (extend)

- [ ] Add cook_state points to the same helper (no second sort path)
- [ ] Re-check seed staples: declaring N/A or both improves tie-break honestly

### Later (only if needed)

- [ ] Mirror formula in SQL for `current_product_versions`, **or** denormalize `completeness_score` on write (trigger/RPC) if ranking must stay server-side under load
- [ ] Trust-weighted likes (v1.2) still sit **above** completeness: trust-likes → score → newest

## Out of scope

- Changing like UX or one-like-per-user rule
- Auto-filling allergens/cook to game the score
- Trimming/archiving low-like versions (v1.2)

## Acceptance criteria

- [ ] Two versions, same likes: richer allergens ranks higher
- [ ] Higher likes always wins even if poorer data
- [ ] After cook ships: `both`+alt beats blank cook at equal likes
- [ ] Log-entry last-used preference still works when set
- [ ] nl/en unaffected (ranking is data-only)

## Open questions

- Include photo / named-portion bonus in v1.0.10 or defer?
- Denormalize score in DB when view performance becomes an issue?

## Test plan

- [ ] Fixture product: two versions, equal likes, different allergen fill → richer is default
- [ ] Bump likes on sparse version → it becomes default
- [ ] After v1.0.7: equal likes, one with `both` filled → wins over unknown cook
