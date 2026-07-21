# Information Architecture — v1.0

## Navigation: bottom tab bar

```
[Diary]   [Reports]   [Settings]
```

(v1.1 adds [Workouts] and [Body]; the 3-tab MVP leaves room.)

## Screen map

```
Auth stack (unauthenticated)
├── Welcome (logo, sign-in options)
├── Sign up / Sign in (email, Google, Apple)
└── Onboarding
    ├── Allergen selection (skippable)
    └── Goals (skippable)

Diary (home)
├── Day header: date picker, macro summary (focus ⇄ overview toggle)
├── Meal sections: Breakfast / snacks / Lunch / snacks / Dinner / snacks
│   ├── [+ Add food] → Add Food screen
│   └── Entry row → Edit portion / Delete
└── [+ Snack] between meals

Add Food (modal, tabs)
├── Scan (camera) → Portion sheet → done
│   └── Not found → Create Product
├── Search → results (allergen badges) → Portion sheet
├── Recents → Portion sheet
└── Quick add (raw macros)

Create Product
└── Form: name*, macros/100g*, portion (prefilled editable), brand, photo, allergens, barcode

Product Page
├── Header: photo, name, brand, source
├── Macro table (per 100 g + per portion)
├── Allergen table (user's allergens pinned)
├── Versions (list by likes → version detail → like)
└── Report (reason sheet)

Reports
├── Day view (per-meal breakdown)
└── Week view (bars + averages)

Settings
├── Profile (name, email)
├── Language (nl/en)
├── Allergens
├── Goals (kcal + macros)
├── Preferences (count up/down, macro display mode)
├── Send feedback (text + screenshot)
├── About (version, licenses, OFF attribution, GitHub Sponsors link)
└── Sign out / Delete account
```

## State conventions

- Auth state gates the whole app (account required).
- Diary date defaults to today; swipe or date-pick to navigate.
- All user preferences stored server-side (survive reinstall).
