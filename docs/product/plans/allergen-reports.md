# Plan: Allergen reports (separate from macro day/week)

| Field | Value |
|---|---|
| Status | Draft |
| Roadmap | [`ROADMAP.md`](../ROADMAP.md) → v1.3 |
| Depends on | Profile allergens, diary entries (+ `allergens` jsonb for quick-add), product version allergen maps |
| Related | Diary red contains pills (shipped in 1.0.0 testing), reports day/week macros |

## Problem

People with selected EU-14 allergens need a clear place to see **how much of what they ate hit those allergens**, without mixing that into kcal/macro charts.

## Goal

A **separate Rapporten tab** for allergens (left of Dag), only visible when `profile.allergens.length > 0`. Macro day/week/month/year stay focused on food macros.

## Locked decisions

| Decision | Choice |
|---|---|
| Entry | Top switcher: **Allergieën \| Dag \| Week** (month/year later on macro side only). Hidden if no allergens set |
| v1 period | **Day only** first; week later |
| Safe score | `grams without contains-hit / total grams eaten`. **Unknown does not count as a hit** → those grams stay in the numerator. Quick-add with no ticks = no hit |
| Score layout | Combined “any of my allergens” score + **per-allergen** scores. Same UX pattern as macros: focus one allergen, **Toon alles** stacks all |
| Top offenders | List with **times logged** + **grams**; sort by grams |
| Macro charts | Never color or replace kcal/macro graphs with allergen data |
| Diary (done) | Red name pills for `contains` only; search/recents badges unchanged; quick-add optional contains ticks |

## Score examples (user allergens: milk, gluten)

| Food | Grams | Version / quick | Hits | Counts as “safe grams”? |
|---|---|---|---|---|
| Yoghurt | 200 | milk=contains | milk | No |
| Bread | 80 | gluten=unknown, milk=free | none | Yes (unknown ≠ hit) |
| Quick “fries” | 150 | no ticks | none | Yes |
| Quick “cheese” | 40 | milk ticked | milk | No |

Combined score that day: safe / total. Per allergen: grams **without that allergen’s contains** / total grams.

## In scope (feature)

- Allergieën tab in Rapporten (gated on profile allergens)
- Day navigation ‹ › / swipe (reuse reports date UX)
- Combined + per-allergen safe-gram scores; Toon alles / focus
- Top offenders: product or custom_name, times, grams (sort grams)
- Disclaimer (LEGAL / allergens.disclaimer)
- nl/en

## Out of scope

- Month/year on allergen tab (macro reports own month/year first)
- Snapshotting product allergens onto every diary row (use current version map + quick-add flags)
- Medical claims / “safe day” language
- Push notifications

## Acceptance criteria

- [ ] No allergens in profile → Allergieën tab not shown
- [ ] With allergens → tab left of Dag; day score + offenders match locked math
- [ ] Toon alles shows combined + each allergen; focus shows one
- [ ] Top offenders: times + grams, sorted by grams
- [ ] Disclaimer visible; nl/en

## Open questions (later)

- Week roll-up: average daily score vs period total grams?
- Offender identity: prefer product_id vs version vs custom_name for quick-add?

## Test plan

- [ ] Profile with milk only; log contains milk → score drops; pill on diary
- [ ] Unknown milk on product → no pill; grams still “safe” for score
- [ ] Quick-add with milk tick → pill + unsafe grams after migration `015`
- [ ] Clear all profile allergens → tab disappears
