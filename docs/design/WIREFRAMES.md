# Wireframes — v1.0

> Status: text wireframes for the build session; visual mockups can follow in `design/`.

## Diary (home)

```
┌──────────────────────────────┐
│ ‹  Tue 21 Jul  ›             │
│ ┌──────────────────────────┐ │
│ │ 1.240 kcal  C 130g       │ │  ← overview mode (tap to switch
│ │ P 88g       F 41g        │ │     to single-macro focus mode)
│ └──────────────────────────┘ │
│ ONTBIJT             420 kcal │
│  • Havermout 60g   228 kcal │
│  • Melk 250ml      113 kcal │
│  [+ voeg toe]                │
│ [+ snack]                    │
│ LUNCH               540 kcal │
│  ...                         │
│ DINER                    ... │
│ [+ snack]                    │
├──────────────────────────────┤
│  Diary    Reports   Settings │
└──────────────────────────────┘
```

## Add food (modal)

```
┌──────────────────────────────┐
│ Scan | Zoeken | Recent | Snel│
│ ┌──────────────────────────┐ │
│ │      [camera view]       │ │
│ │   richt op de barcode    │ │
│ └──────────────────────────┘ │
└──────────────────────────────┘
Not found state:
│  Product niet gevonden       │
│  [ + Nieuw product maken ]   │  ← primary button
```

## Portion sheet

```
┌──────────────────────────────┐
│ Hamburger (AH)          🌾❗  │  ← gluten badge (user allergen)
│  ◉ 1 burger (150 g)   [- 1 +]│
│  ○ gram               [150 ] │
│  345 kcal · C 28 · P 18 · F17│
│ [ Toevoegen aan Lunch ]      │
└──────────────────────────────┘
```

## Create product

```
│ Naam*            [        ] │
│ Merk             [        ] │
│ Per 100 g:                  │
│  kcal* [  ] KH* [  ]        │
│  Eiwit*[  ] Vet*[  ]        │
│ Portie: [1 portie] = [100] g│  ← editable prefill, never 1 g
│ Foto   [📷]  Allergenen [>] │
│ [ Opslaan & loggen ]        │
```

## Product page

```
│ [foto] Hamburger — AH        │
│ Bron: community · v3 ♥12     │
│ Per 100g / per portie tabel  │
│ Allergenen:                  │
│  Gluten     ● bevat          │
│  Lactose    ○ vrij           │
│  Noten      ◌ onbekend       │
│ [Versies (3)]      [⚑ Meld] │
│ ⓘ Controleer altijd het     │
│   etiket — geen medisch adv. │
```

## Reports (week)

```
│  ‹ Deze week ›               │
│  ▂▅▃▆▄▁▂  (kcal per dag)     │
│  Gem: 1.850 kcal             │
│  C 190g · P 95g · F 60g      │
```
