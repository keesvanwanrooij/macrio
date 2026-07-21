# Minor & Patch Planning — current cycle

> Planning board for improvements within the current minor version (e.g. v1.0 → v1.0.1, v1.0.2 …), fed by founder notes (`project-context/`) and community feedback (in-app + GitHub issues). Big features stay in `ROADMAP.md`; this file is for the small, fast iterations between them.

## How to use this file

1. Collect raw notes and feedback below under **Inbox**.
2. Each planning pass: triage Inbox items → assign to a patch release or reject (with reason).
3. Ship, move the block to **Released**, update `CHANGELOG.md`.

**Ordering:** Patches under **Planned** are listed in **ship order** (next patch first). Reorder freely when priorities change — no need to ask. Keep version numbers sequential; rename headings if you insert or merge patches.

**Pre-public goal:** Finish food-logging polish (v1.0.1 → v1.0.8) to founder needs, then go public and iterate on community feedback. Workouts stay in `ROADMAP.md` (v1.1+).

## Inbox (untriaged)

_—_

## Planned

_Ship order: v1.0.1 → v1.0.2 → … → v1.0.8 (then public)_

### v1.0.1 — portion units (g / ml) + default 100 g

**Found during:** Supabase seed review; founder diary testing.

**Problem:** Liquids show as grams. Custom amount often starts from an awkward default instead of a natural 100 g / 100 ml.

**This patch:**
- Add `unit: 'g' | 'ml'` on portion objects in JSONB (no SQL migration — `portions` is already flexible).
- Update seed data (`002_seed.sql`) for liquid staples.
- UI: portion picker, product page, and create-product show ml where `unit === 'ml'`.
- Macro math: keep per-100g internally for now; for water-like liquids 1 ml ≈ 1 g (acceptable for v1.0.1).
- When the user picks custom grams/ml, **default the amount to 100** (g now; ml when the product/portion unit is ml).

**Affected seed items:** halfvolle/volle melk, havermelk, cola, sinaasappelsap, bier, rode wijn.

### v1.0.2 — auth emails + forgot password

**Found during:** founder auth testing (confirm email turned off for faster iteration).

**Problem:** Sign-up without verification is fine for testing only. Default Supabase emails are unbranded. No forgot-password path yet.

**Before public release:**
- Turn **Confirm email** back **ON** in Supabase (**Authentication → Providers → Email**). Keep minimum password length at 8.
- Align redirect URLs with `EXPO_PUBLIC_AUTH_REDIRECT_URL` / real app deep links when shipping.
- Brand **confirm signup** (and related) email templates with Macrio copy/logo/colors.
- **Forgot password:** Supabase reset-password email + in-app request/reset screens (nl/en). Brand the reset template with the same pass as confirm.

**App:** verify sign-up “check your email” and reset-password copy in `en.json` / `nl.json`.

### v1.0.3 — Settings identity & dates

**Found during:** founder onboarding / profile testing.

**Problem:** Username typos are stuck; DOB is awkward to type; no app version visible for support; date format should be a preference.

**This patch:**
- **Edit username** in Settings (unique check, format rules, same constraints as sign-up).
- **App version** shown cleanly in Settings (top or bottom).
- **DOB:** calendar date picker in onboarding and profile.
- **Date format setting** (e.g. DD-MM-YYYY vs other common formats) applied wherever dates are shown/entered.

### v1.0.4 — onboarding & daily goals UX

**Found during:** founder goal-calculator and allergen onboarding testing.

**Problem:** Calculator dominates the goals step; allergen skip is unclear; body fields can be nonsense; macro targets are hard for non-standard diets.

**This patch:**
- Hide the body/goal calculator by default. Primary control is a button: **“Berekenen op basis van je lichaam”** / EN equivalent (not plain text).
- Allergen step: **“Niets” / “Nothing”** button that behaves like skip — user has no allergies; keep `allergens` as `[]` (all unset / none selected).
- Soft validation on age (from DOB), height, weight: reasonable limits, friendly non-shaming errors.
- While editing daily targets: hint that leaving one of carbs/protein/fat empty **autocompletes** it from kcal + the other two; show **kcal equivalents** next to each macro.

### v1.0.5 — diary meal totals & daily progress

**Found during:** founder diary testing.

**Problem:** Only day-level totals; hard to see progress toward goals while logging.

**This patch:**
- Show **macro totals per meal** (not only the daily total).
- On the diary/tracker, show **progress toward daily kcal and macros** (clear bars or equivalent; match existing count up/down + focus/overview modes).

### v1.0.6 — named portions (S / M / L)

**Found during:** founder product/portion testing. Depends on v1.0.1 units landing first.

**Problem:** One product often needs several natural sizes (e.g. small / medium / large apple), not only a single default portion.

**This patch:**
- Support multiple named portions per product version (labels + grams/ml).
- Picker UX when logging; seed a few Dutch staples with S/M/L where it helps.

### v1.0.7 — cooked / uncooked / not applicable

**Found during:** founder logging (rice, meat, pasta/spaghetti and similar).

**Problem:** Macros differ a lot between raw and prepared weight. Without a clear state, users log “100 g rice” and get the wrong calories.

**This patch:**
- DB field on product versions (or products — pick one place and stick to it): `cook_state` = `cooked` | `uncooked` | `not_applicable`.
- UI selector on create/edit product and visible when logging/searching (so “rijst ongekookt” vs “rijst gekookt” is obvious).
- Seed/update staples where it matters (rice, pasta, meat, similar); use `not_applicable` for foods where cooking does not change the reference (e.g. many drinks, oils, packaged ready items).
- Ship **before** the Dutch parent seed (v1.0.8) so the base catalog stores cook state from day one.

### v1.0.8 — parent food catalog + Dutch ~80% base seed (pre-launch)

**Found during:** founder catalog strategy. Pitch / working brief: `project-context/parent-food-catalog-pitch.md`.

**Problem:** If the community creates free-floating products with no shared parents, the DB becomes a mess before launch. Need locked parent foods + a strong Dutch staple base covering ~80% of everyday eating.

**This patch (foundation + seed; detail in pitch file):**
- Data model: system **parent** foods (users cannot create parents); community can add **child** products/versions linked to a parent, or stay parentless when needed.
- Seed the most important **Dutch-market** parent foods with complete, consistent data (macros, allergens, portions, **cook_state**) before public launch.
- Use a premium AI pass (founder-led) against the pitch file to draft/fill the parent list; human review before merge.
- Do **not** wait for v1.2 trust graph — this is a launch blocker for catalog hygiene.

## Released

_—_

## Rejected / deferred

| Item | Reason |
|---|---|
| Feedback: multiple screenshots (max 5) | Keep single image for now. Left in `project-context/notes.md` for later. |
| Quick-log % macro sliders | Parked in `ROADMAP.md` v1.3 (too big for a half-ship patch). |
| Personal reorder of add-food tabs (scan/search/recent/quick) | Parked in `ROADMAP.md` v1.3 personalization. |
| Auto-trim low-like product versions | Parked in `ROADMAP.md` v1.2 governance. |
