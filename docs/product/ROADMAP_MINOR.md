# Minor & Patch Planning — current cycle

> Planning board for improvements within the current minor version (e.g. v1.0 → v1.0.1, v1.0.2 …), fed by founder notes (`project-context/notes.md`), Supabase/GitHub feedback, and GitHub issues. Big features stay in `ROADMAP.md`.

## How to use this file

1. Triage Supabase/GitHub feedback → **Inbox** or **Planned** here, [`ROADMAP.md`](ROADMAP.md), [`notes.md`](../../project-context/notes.md) (your ideas), or another file in `project-context/` (e.g. pitch docs).
2. Tick **`[x]`** on items as you ship them in the app.
3. When **all** boxes in a patch section are done: update `CHANGELOG.md`, bump version in `app/app.json` + `VERSION`, git tag `v1.0.x`, move block to **Released**.
4. Do **not** bump version for partial progress — app stays **1.0.0** until a full patch releases.

**Ordering:** Patches under **Planned** are listed in **ship order** (next patch first).

**Working plans:** [`plans/`](plans/README.md)

**Pre-public goal:** Finish v1.0.1 → v1.0.8, then go public.

## Inbox (untriaged)

_—_

## Planned

_Ship order: v1.0.1 → v1.0.2 → … → v1.0.8 (then public)_

### v1.0.1 — portion units (g / ml) + default 100 g

**Plan:** [`plans/v1.0.1-portion-units.md`](plans/v1.0.1-portion-units.md)

**Progress:**

- [ ] `unit: 'g' | 'ml'` on portion JSONB + UI
- [ ] Seed liquids (melk, cola, bier, …) in `002_seed.sql`
- [ ] Default custom amount to 100 (g/ml)
- [x] Fractional named-portion counts (±0.5, typed) — shipped early in 1.0.0 testing

### v1.0.2 — auth emails + forgot password

**Plan:** [`plans/v1.0.2-auth-emails.md`](plans/v1.0.2-auth-emails.md)

**Progress:**

- [ ] Confirm email ON for production + redirect URLs
- [ ] Branded confirm + reset email templates
- [ ] In-app forgot password (nl/en)

### v1.0.3 — Settings identity & dates

**Plan:** [`plans/v1.0.3-settings-identity.md`](plans/v1.0.3-settings-identity.md)

**Progress:**

- [ ] Edit username in Settings
- [x] App version shown in Settings (reads `app.json` via expo-constants) — early in 1.0.0 testing
- [ ] DOB calendar picker (onboarding + profile)
- [ ] Date format setting

### v1.0.4 — onboarding & daily goals UX

**Plan:** [`plans/v1.0.4-onboarding-goals.md`](plans/v1.0.4-onboarding-goals.md)

**Progress:**

- [ ] Calculator behind “Berekenen op basis van je lichaam” button
- [ ] Allergen “Niets / Nothing” (= skip, `allergens: []`)
- [ ] Soft body validation (height/weight/age)
- [ ] Macro autocomplete + kcal equivalents

### v1.0.5 — diary meal totals & daily progress

**Plan:** [`plans/v1.0.5-diary-progress.md`](plans/v1.0.5-diary-progress.md)

**Progress:**

- [ ] Macro totals per meal
- [ ] Progress toward daily kcal/macros on diary

### v1.0.6 — named portions (S / M / L)

**Plan:** [`plans/v1.0.6-named-portions.md`](plans/v1.0.6-named-portions.md)

**Progress:**

- [ ] Multiple named portions per version
- [ ] Picker when logging + seed examples

### v1.0.7 — cooked / uncooked / not applicable

**Plan:** [`plans/v1.0.7-cook-state.md`](plans/v1.0.7-cook-state.md)

**Progress:**

- [ ] `cook_state` column + migration
- [ ] UI on create/edit/search/log
- [ ] Seed staples (rice, pasta, meat, …)

### v1.0.8 — parent food catalog + Dutch ~80% base seed (pre-launch)

**Plan:** [`plans/v1.0.8-parent-catalog.md`](plans/v1.0.8-parent-catalog.md) · Pitch: [`parent-food-catalog-pitch.md`](../../project-context/parent-food-catalog-pitch.md)

**Progress:**

- [ ] Parent/child data model
- [ ] Dutch parent seed (~80% coverage)
- [ ] Founder + AI fill pass + human review

## Released

### v1.0.0 — MVP (founder testing; tag `v1.0.0` when ready)

**App version:** `1.0.0` · See `CHANGELOG.md`

**Core MVP:** all items checked in [`ROADMAP.md`](ROADMAP.md) v1.0 section.

**Also shipped during 1.0.0 testing (no version bump — counts toward later patches):**

- [x] Goal calculator (Mifflin-St Jeor) in onboarding + Settings
- [x] Username sign-up / login; profile grants fix (migration 009)
- [x] Add barcode later (type/scan, migration 010)
- [x] Recents: dedupe by product, each user's last-logged version
- [x] Product report sheet (modal; fixes Android 3-button limit)
- [x] App version in Settings + feedback metadata

## Rejected / deferred

| Item | Reason |
|---|---|
| Feedback: multiple screenshots (max 5) | Keep single image for now. `notes.md` Old notes. |
| Quick-log % macro sliders | `ROADMAP.md` v1.3 |
| Personal reorder of add-food tabs | `ROADMAP.md` v1.3 |
| Auto-trim low-like product versions | `ROADMAP.md` v1.2 |
| User feedback at scale (replies, status, dedupe) | Not decided — [`community-feedback-future.md`](../../project-context/community-feedback-future.md) |
