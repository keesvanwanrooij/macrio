# User Flows — v1.0

## F1 — First launch

```
Open app → Sign in / Sign up (email, Google, Apple)
  → Language auto-detected from phone (nl/en)
  → Allergen selection (multi-select EU-14, skippable)
  → Optional goals (kcal + macros, skippable)
  → Diary (today)
```

## F2 — Log a known product (happy path, ≤10 s)

```
Diary → [+] on a meal → Scan barcode
  → Product found → portion pre-filled (last used or default portion)
  → Adjust portion (optional) → Add
  → Back on diary, totals updated, allergen badge shown if relevant
```

## F3 — Barcode not found → create product

```
Scan → "Not found" screen
  → [Create product] (primary button)
  → Form: name*, macros per 100 g*, portion name + grams (prefilled "1 portie – 100 g", editable),
          photo (camera/gallery, optional), allergen tags (optional)
  → Save → product logged immediately AND published to community DB
```

## F4 — Search and log

```
Diary → [+] on meal → Search tab
  → Type query → generic results first, then branded; allergen badges inline
  → Tap product → portion → Add
Alternative: Recents tab → tap → portion → Add
```

## F5 — Review my day/week

```
Diary → summary header (toggle: one-macro focus ⇄ all four)
Reports tab → Day | Week → totals + per-meal breakdown
```

## F6 — Product versions

```
Product page → "Versions" → list sorted by likes
  → view any version → like it → most-liked becomes default
Product page → [⚑ Report] → reason → submitted to moderation queue
```

## F7 — Feedback

```
Settings → "Send feedback" → text + optional screenshot
  → auto metadata (version, session time, install age) → submit
```

## F8 — Settings

```
Settings → language / count up-down / macro display / allergens / goals
        → sign out / delete account (GDPR: erases personal data, anonymizes contributions)
```
