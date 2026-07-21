# MVP Scope — v1.0 (one build session)

> Everything in this file is IN. Everything else is OUT (see `NON_GOALS.md`).

## In scope

### Onboarding & account
- Sign up / sign in required at startup: email+password, Google, Apple.
- Minimal profile: display name, language (defaults to phone), allergen selection (0–14 EU allergens).
- Optional goal setup: daily kcal + macro targets (manual entry; questionnaire is v1.3).

### Food diary
- Day view with meals: Breakfast, Lunch, Dinner (fixed order) + user-added snack meals between/after (unlimited).
- Add food to a meal via: barcode scan, text search, recents, or manual quick-add.
- Global recents list (across all meals, not per meal).
- Fuzzy/generic search: searching "appel"/"apple" ranks generic entries first.
- Edit/delete logged entries; adjust portion (grams or product portions, e.g. "1 burger (150 g)").
- Macro summary per meal and per day: kcal, carbs, protein, fat.
- Display toggle: focus mode (one macro large) ⇄ overview mode (all four at a glance).
- User setting: count up (consumed) or count down (remaining vs target).

### Products & allergens
- Product database seeded from Open Food Facts (name nl/en, brand, barcode, macros per 100 g, portion definitions, allergen tags, photo URL).
- Every product shows allergen status per EU-14 allergen: contains / free / unknown.
- User's selected allergens produce a clear warning badge on search results and product pages.
- Barcode not found → one tap to "Create product": name, macros per 100 g, portion name + weight (default sensible, NOT 1 gram), optional photo, optional allergen tags.
- Community layer (simple): products are public once created; each edit creates a new version; users can like a version and browse versions; the most-liked version is shown by default; report button flags an entry (queue stored for later moderation — full voting in v1.2).

### Reports
- Daily and weekly macro totals; simple period picker.

### Settings
- Language (nl/en), count up/down, macro display mode, allergen selection, goals, sign out, account deletion (GDPR).

### Feedback
- In-app feedback form: text + optional screenshot attachment + automatic metadata (app version, session time, time since install). Stored in Supabase; drives roadmap.

## Explicitly out (v1.0)

Workouts, body metrics, trust-graph weighting, community posts/groups/chat, meal planning, AI photo logging, health-platform sync, NEVO import, kJ/imperial units, offline-first sync (basic online-required is acceptable for MVP), web version.

## Definition of done for v1.0

See `docs/process/DEFINITION_OF_DONE.md`. Headline: founder can log a full real day of eating — including scanning an unknown product and creating it — on his own phone via Expo Go, in Dutch, with gluten warnings visible.
