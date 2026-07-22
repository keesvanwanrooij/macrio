# Plan: Allergen reports (topic under period switcher)

| Field | Value |
|---|---|
| Status | Draft |
| Roadmap | [`ROADMAP.md`](../ROADMAP.md) → v1.3 |
| Depends on | Profile allergens, diary entries (+ `allergens` jsonb for quick-add), product version allergen maps |
| Related | Diary red contains pills (shipped in 1.0.0 testing), reports day/week macros; Fitness topic after workouts (v1.1) |

## Problem

People with selected EU-14 allergens need a clear place to see **how much of what they ate hit those allergens**, without mixing that into kcal/macro charts.

## Goal

Rapporten keeps one **period** switcher (when). Under it, a **topic** switcher (what). Allergen analytics live under topic **Allergens**, only if the user has profile allergens set. Nutrition (macros) and later Fitness stay separate.

## Reports chrome (locked)

```
Rapporten
┌─────────────────────────────┐
│  Day │ Week │ Month │ Year  │  ← period (always; month/year ship with v1.3 macros)
└─────────────────────────────┘
┌─────────────────────────────┐
│ Nutrition │ Fitness │ Allergens │  ← topic (see visibility rules)
└─────────────────────────────┘
  …topic body for the selected period…
```

| Row | Options (EN) | Options (NL) | Notes |
|---|---|---|---|
| Period | Day \| Week \| Month \| Year | Dag \| Week \| Maand \| Jaar | Same slider we keep; swipe/‹ › still move the period |
| Topic | Nutrition \| Fitness \| Allergens | Voeding \| Fitness \| Allergieën | Second menu **below** period |

### Why these topic words

| Label | Why |
|---|---|
| **Nutrition / Voeding** | Clearer than “Food” (diary is also food). Means macro reports (kcal, KH, eiwit, vet) |
| **Fitness** | Matches workouts / heatmap; not “Sport” (can mean watching sports) |
| **Allergens / Allergieën** | Matches Settings “Mijn allergenen”; short |

Alternatives considered (not chosen): Food \| Fitness \| Allergens (Food too vague); Macros \| Workouts \| Allergens (jargony for some users).

### Topic visibility

| Topic | Shown when |
|---|---|
| Nutrition | Always |
| Fitness | When workouts / fitness reports exist (v1.1+). Until then omit the segment (do not show disabled empty) |
| Allergens | Only when `profile.allergens.length > 0`. No allergens → no Allergens segment (and no empty slot) |

If only Nutrition is available, the topic row can hide entirely (period-only chrome) or show a single Nutrition pill; prefer **hide topic row** until a second topic exists.

## Locked decisions (allergen content)

| Decision | Choice |
|---|---|
| Entry | Period row + topic row as above. Not a separate top tab “Allergieën \| Dag \| Week” |
| Period for allergens | Same Day/Week/Month/Year as Nutrition; start with **Day** (+ Week when ready). Month/year on allergens after Nutrition month/year feel solid |
| Safe score | `grams without contains-hit / total grams eaten`. **Unknown does not count as a hit** → those grams stay in the numerator. Quick-add with no ticks = no hit |
| may_contain in scores | **Settings toggle (personal):** user chooses whether `may_contain` / kan bevatten counts as a hit. Personal preference; default TBD when building. Diary still shows orange pills either way |
| Score layout | Combined “any of my allergens” score + **per-allergen** scores. Same UX pattern as macros: focus one allergen, **Toon alles** stacks all |
| Top offenders | List with **times logged** + **grams**; sort by grams |
| Macro charts | Never color or replace Nutrition graphs with allergen data |
| Diary (done) | Red pills for `contains`, orange for `may_contain` next to food name; search/recents badges + portion warning use full labels; interactive chips use short names + legend |

## Score examples (user allergens: milk, gluten)

| Food | Grams | Version / quick | Hits | Counts as “safe grams”? |
|---|---|---|---|---|
| Yoghurt | 200 | milk=contains | milk | No |
| Bread | 80 | gluten=unknown, milk=free | none | Yes (unknown ≠ hit) |
| Quick “fries” | 150 | no ticks | none | Yes |
| Quick “cheese” | 40 | milk ticked | milk | No |

Combined score that day: safe / total. Per allergen: grams **without that allergen’s contains** / total grams.

## In scope (feature)

- Topic switcher under period; Allergens gated on profile allergens
- Day (then week) navigation ‹ › / swipe (reuse reports date UX)
- Combined + per-allergen safe-gram scores; Toon alles / focus
- Top offenders: product or custom_name, times, grams (sort grams)
- Disclaimer (LEGAL / allergens.disclaimer)
- nl/en

## Out of scope

- Snapshotting product allergens onto every diary row (use current version map + quick-add flags)
- Medical claims / “safe day” language
- Push notifications
- Building Fitness topic body here (only reserve the segment for v1.1+)

## Acceptance criteria

- [ ] No allergens in profile → Allergens topic not shown; Nutrition (and Fitness if any) only
- [ ] With allergens → Allergens topic visible under period; day score + offenders match locked math
- [ ] Period switcher still Day/Week/Month/Year for Nutrition; Allergens uses the same period control
- [ ] Toon alles shows combined + each allergen; focus shows one
- [ ] Top offenders: times + grams, sorted by grams
- [ ] Disclaimer visible; nl/en

## Open questions (later)

- Week roll-up: average daily score vs period total grams?
- Offender identity: prefer product_id vs version vs custom_name for quick-add?
- When only Nutrition exists: hide topic row vs show single selected pill?

## Test plan

- [ ] Profile with milk only; log contains milk → score drops; pill on diary
- [ ] Unknown milk on product → no pill; grams still “safe” for score
- [ ] Quick-add with milk tick → pill + unsafe grams (allergens map migration)
- [ ] Clear all profile allergens → Allergens topic disappears
- [ ] Period stays usable on Nutrition when Allergens is hidden
