# Minor & Patch Planning — current cycle

> Planning board for **v1.0.x patches**. Big features stay in [`ROADMAP.md`](ROADMAP.md). Fed by founder notes (`project-context/notes.md`), Supabase/GitHub feedback, and GitHub issues.

## How to use this file

1. Triage feedback → **Inbox** or **Planned** here, [`ROADMAP.md`](ROADMAP.md), [`notes.md`](../../project-context/notes.md), or another `project-context/` file.
2. Tick **`[x]`** on items as you ship them in the app.
3. When **all** boxes in a patch section are done: update `CHANGELOG.md`, bump version in `app/app.json` + `VERSION`, git tag `v1.0.x`, move block to **Released**.
4. Do **not** bump version for partial progress — app stays **1.0.0** until a full patch releases.

**Ordering:** Patches under **Planned** are listed in **ship order** (next patch first). **Reorder freely** when priorities change; keep version numbers sequential (rename headings if you insert or merge patches).

**Working plans:** [`plans/`](plans/README.md)

**Pre-public goal:** Finish **v1.0.1 → v1.0.10**, then go public.

## Inbox (untriaged)

_—_

## Planned

_Ship order: v1.0.1 → … → v1.0.10 (then public)_

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

### v1.0.4 — onboarding & daily goals UX (+ g/kg macro sliders)

**Plan:** [`plans/v1.0.4-onboarding-goals.md`](plans/v1.0.4-onboarding-goals.md)

**Progress:**

- [ ] Calculator behind “Berekenen op basis van je lichaam” button
- [ ] Allergen “Niets / Nothing” (= skip, `allergens: []`)
- [ ] Soft body validation (height/weight/age)
- [ ] Macro autocomplete + kcal equivalents
- [ ] **Goal macro sliders** (onboarding + Settings): set kcal (or calculate), then protein/carbs/fat on logical g/kg ranges (e.g. protein ~0.8–2.2 g/kg); show **grams and kcal** for each macro so targets are understandable

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

### v1.0.9 — create product UX (allergens, names, macro sliders)

**Plan:** [`plans/v1.0.9-create-product-ux.md`](plans/v1.0.9-create-product-ux.md)

**Progress:**

- [ ] **Set remaining allergens to free (green):** one action so users do not tap every allergen twice after marking contains
- [ ] **Optional NL + EN name fields** when creating/editing a product; UI language decides which field is primary (nl → start with Dutch; en → start with English); other language optional
- [ ] **Create-food macro sliders:** user enters total kcal for the product (or per 100 g flow); sliders for carbs/protein/fat share that energy; grams cannot exceed product weight (e.g. 100 g product → max 100 g of a macro); show grams + kcal so create is understandable

### v1.0.10 — diary & search QoL (log, recents, favorites)

**Plan:** [`plans/v1.0.10-diary-search-qol.md`](plans/v1.0.10-diary-search-qol.md)

**Progress:**

- [ ] **Swipe to delete** diary food entries (with undo or confirm as fits existing patterns)
- [ ] **Recents restore last grams** (including custom amounts like 130 g), not only product/version
- [ ] **Version picker on log-entry** (portion screen): default = most likes, then newest; remember **last version this user used** for that product when possible
- [ ] **Star / favorite** products (or versions): save for quick filter in **Search**

## Released

### v1.0.0 — MVP (founder testing; tag `v1.0.0` when ready)

**App version:** `1.0.0` · See `CHANGELOG.md`

**Core MVP:** all items checked in [`ROADMAP.md`](ROADMAP.md) v1.0 section.

**Also shipped during 1.0.0 testing (no version bump — counts toward later patches):**

- [x] Goal calculator (Mifflin-St Jeor) in onboarding + Settings
- [x] Username sign-up / login; profile grants fix (migration 009)
- [x] Add barcode later (type/scan, migration 010)
- [x] Scanner viewfinder + double-read confirm; EAN-13 normalize; edit/delete barcode (migration 011)
- [x] Barcode check digit + EAN/UPC/GS1-128 help on add/edit (migration 012)
- [x] Recents: dedupe by product, each user's last-logged version
- [x] Product report sheet (modal; fixes Android 3-button limit)
- [x] App version in Settings + feedback metadata

## Rejected / deferred

| Item | Reason |
|---|---|
| Feedback: multiple screenshots (max 5) | Keep single image for now. Also listed under Old notes. |
| Quick-log % macro sliders (restaurant) | `ROADMAP.md` v1.3 |
| Personal reorder of add-food tabs | `ROADMAP.md` v1.3 |
| Auto-trim low-like product versions | `ROADMAP.md` v1.2 |
| Version ownership / 30-day fork / visibility / duplicate-from-version / admin product merge | `ROADMAP.md` v1.2 |
| Recipes, community duplicate meals, salt/micros | `ROADMAP.md` v1.4 |
| Personal meal templates + meal planner | `ROADMAP.md` v1.3 |
| Analytics / success metrics tooling | `ROADMAP.md` v1.5 |
| User feedback at scale (replies, status, dedupe) | Not decided — [`community-feedback-future.md`](../../project-context/community-feedback-future.md) |
