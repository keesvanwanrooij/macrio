# Minor & Patch Planning — pre-public (0.x)

> Planning board for **0.x** patches before public **1.0.0**. Post-launch majors stay in `[ROADMAP.md](ROADMAP.md)`. Fed by founder notes (`docs/founder/notes.md`), Supabase/GitHub feedback, and GitHub issues.

**Version scheme:** `0.1.0` → … → `0.16.0` (pre-public) → then `1.0.0` public. See `[VERSIONING.md](../process/VERSIONING.md)`.

Patches are **grouped** below. Some plan filenames still use older `v1.0.x` names; the **heading is the ship identity**.

**After each group is fully shipped:** run a **simplify / DRY / prune** pass (see checkbox under each group). Use **Prompt 2** in `[prompts/02-after-group-simplify.md](../../prompts/02-after-group-simplify.md)`. Goal: cleaner code for the next group, not new features.

---

## Group A — Launch ops & account

### v0.1.0 — crash reporting / error monitoring

**Plan:** `[plans/v0.1.0-crash-reporting.md](plans/v0.1.0-crash-reporting.md)`

**Progress:**

- [x] Integrate **Sentry** (or equivalent) for crashes + handled errors
- [x] Wire Expo / RN release source maps; env DSN (no secrets in git)
- [x] Smoke: force test error in dev; verify event in dashboard
- [x] Ship **before** public users (analytics / product funnels ship as **v0.15.0**, not with Sentry)

*Note: portion-units content lives in **v0.8.0** (plan file* `v0.8.0-portion-units.md` *kept).*

### v0.2.0 — auth emails + forgot password

**Plan:** `[plans/v0.2.0-auth-emails.md](plans/v0.2.0-auth-emails.md)`

**Progress:**

- [x] Confirm email ON for production + redirect URLs (documented; founder flips Supabase toggle when verifying)
- [x] Branded confirm + reset email templates (`backend/supabase/email-templates/`)
- [x] In-app forgot password (nl/en)

### v0.3.0 — Settings identity, dates + GDPR account delete / export

**Plan:** `[plans/v0.3.0-settings-identity-gdpr.md](plans/v0.3.0-settings-identity-gdpr.md)`  
*(Legacy stubs:* `[v1.0.3-settings-identity.md](plans/v1.0.3-settings-identity.md)`*,* `[v1.0.3-gdpr-account.md](plans/v1.0.3-gdpr-account.md)`*)*

**Progress:**

- [x] Edit username in Settings
- [x] Change password in Settings
- [x] Change email address in Settings
- [x] App version shown in Settings (reads Expo config via expo-constants) — early founder testing
- [x] Shared native date picker (Expo / community datetimepicker)
- [x] DOB calendar picker (onboarding + profile) via shared picker
- [x] Tap date on **diary + reports** → jump to that day (week mode: jump to week containing the day); max = today; any past date
- [x] Date format setting (default **DD-MM-YYYY**; also YYYY-MM-DD, MM-DD-YYYY)
- [x] **Account deletion** in-app (soft delete + **30-day grace**, then purge; App Store / Play + GDPR)
- [x] **Download my data** (JSON + diary CSV: profile, diary, goals/body metrics, own feedback) in the same Settings privacy flow

### After Group A — simplify / DRY / prune

- [x] Signup: taken username shows `auth.usernameTaken` (no silent `user_<id>`); migration `018` + `is_username_available`
- [x] Run **Prompt 2** in `[prompts/02-after-group-simplify.md](../../prompts/02-after-group-simplify.md)` on areas touched by Group A (auth, settings/account, crash ops). Simplify duplicates, share helpers, remove dead/obsolete code paths. No new features.

---

## Group B — Goals & onboarding

### v0.4.0 — onboarding & daily goals UX (+ g/kg macro sliders)

**Plan:** `[plans/v0.4.0-onboarding-goals.md](plans/v0.4.0-onboarding-goals.md)`

**Progress:**

- [x] Calculator behind “Berekenen op basis van je lichaam” button
- [x] Allergen “Niets / Nothing” (= skip, `allergens: []`)
- [x] Soft body validation (height/weight; no age message; ≤0 blocked)
- [x] Macro autocomplete + kcal equivalents
- [x] **Goal macro sliders** (onboarding + Settings): set kcal (or calculate), then protein/carbs/fat on logical g/kg ranges (e.g. protein ~0.8–2.2 g/kg); show **grams and kcal** for each macro so targets are understandable
- [ ] *(Later)* Auto-calc from **health-synced weight** + g/kg sliders (carbs fill rest) → `ROADMAP.md` v1.2

### v0.4.1 — goal macro modes (Simple / Athlete / Keto)

**Plan:** `[plans/v0.4.1-macro-modes.md](plans/v0.4.1-macro-modes.md)`

**Status:** Shipped, then **superseded** by a unified % editor (default 50/20/30; no mode chips). `goal_macro_mode` column unused by UI. See `docs/context/protein-g-per-kg.md` for deferred g/kg calculator ideas.

**Progress (historical):**

- [x] Mode selector: Simple / Athlete / Keto (nl: Simpel / Sporter / Keto)
- [x] Simple + Keto: % sliders, ring cascade (C→P→F→C), kcal fixed; scale `max(floor, highest %)` (Simple floor 60, Keto floor 70)
- [x] Athlete: protein 0.8–2.0 g/kg (defaults 1.5 / 1.3 / 1.4 by goal); fat as %; carbs fill; edit carbs → fat
- [x] Mode switch resets defaults from current kcal; persist `goal_macro_mode`
- [x] Migration `019`; version **0.4.1**
- [x] *(Follow-up)* Unified % editor replaces modes; calculator always seeds 50/20/30

### After Group B — simplify / DRY / prune

- [x] Run **Prompt 2** in `[prompts/02-after-group-simplify.md](../../prompts/02-after-group-simplify.md)` on onboarding + goals/calculator paths. DRY shared goal math/UI; prune superseded calculator/onboarding code.

---

## Group C — Diary & reports

### v0.5.0 — diary meal totals & daily progress

**Plan:** `[plans/v0.5.0-diary-progress.md](plans/v0.5.0-diary-progress.md)`

**Progress:**

- [ ] Macro totals per meal
- [ ] Progress toward daily kcal/macros on diary (meal-level remaining)
- [x] Diary header progress bars + stronger totals; focus swipe L/R; long-press → overview; overview does not tap-toggle — early founder testing
- [x] Reports: selectable macros (tap), ghost bars, historical goals, swipe/‹ › for day·week, tap bar → diary (migration `014`)
- [x] Reports day: selected-macro progress bars; snacks deducted then ÷3; over = total + goal marker
- [ ] **Reports meal order:** show snack meals in **chronological diary order** (e.g. snack between breakfast and lunch stays between those mains). Do not dump all snacks at the end of the day report
- [ ] Reports: pie chart for macro distribution (carbs / protein / fat of the day or week)

### v0.6.0 — rule-based report coaching texts

**Plan:** `[plans/v0.6.0-report-coaching.md](plans/v0.6.0-report-coaching.md)`

**Progress:**

- [ ] Day (and week where natural) **rule-based** lines under reports, nl/en — e.g. hit/miss goal, macro balance tips
- [ ] Example tone: `✅ 182g eiwit (102%)` · `⚠️ 340 kcal onder doel` · `💡 Nog 18g vet beschikbaar`
- [ ] Pure rules (no LLM); AI coach stays **v2.0**

### v0.7.0 — diary & search QoL (log, recents, favorites)

**Plan:** `[plans/v0.7.0-diary-search-qol.md](plans/v0.7.0-diary-search-qol.md)`

**Progress:**

- [ ] **Swipe to delete** diary food entries (with undo or confirm as fits existing patterns)
- [ ] **Recents restore last grams** (including custom amounts like 130 g), not only product/version
- [ ] **Version picker on log-entry** (portion screen): default = most likes → **completeness score** → newest; remember **last version this user used** for that product when possible. Plan: `[plans/version-completeness-ranking.md](plans/version-completeness-ranking.md)`
- [ ] **Star / favorite** products (or versions): save for quick filter in **Search**
- [ ] **Search synonyms on versions:** version owner sets one **primary name** + optional **synonyms** (nl/en as fits); search matches primary and synonyms so foods are easier to find

### After Group C — simplify / DRY / prune

- [ ] Run **Prompt 2** in `[prompts/02-after-group-simplify.md](../../prompts/02-after-group-simplify.md)` on diary, reports, search/recents. Merge duplicate macro/progress helpers; remove obsolete UI paths.

---

## Group D — Portions & units

### v0.8.0 — portion units (g / ml) + default 100 g

**Plan:** `[plans/v0.8.0-portion-units.md](plans/v0.8.0-portion-units.md)`

**Progress:**

- [ ] `unit: 'g' | 'ml'` on portion JSONB + UI
- [ ] Seed liquids (melk, cola, bier, …) in `002_seed.sql`
- [ ] Default custom amount to 100 (g/ml)
- [x] Fractional named-portion counts (±0.5, typed) — early founder testing

### v0.9.0 — named portions (S / M / L)

**Plan:** `[plans/v0.9.0-named-portions.md](plans/v0.9.0-named-portions.md)`

**Progress:**

- [ ] Multiple named portions per version
- [ ] Picker when logging + seed examples

### After Group D — simplify / DRY / prune

- [ ] Run **Prompt 2** in `[prompts/02-after-group-simplify.md](../../prompts/02-after-group-simplify.md)` on portion/unit logging UI + related seed helpers. One clear portion model; drop dead amount/unit code.

---

## Group E — Catalog, quality & nutrition data

### v0.10.0 — cooked / uncooked / not applicable (+ dual macros)

**Plan:** `[plans/v0.10.0-cook-state.md](plans/v0.10.0-cook-state.md)`

**Progress:**

- [ ] `cook_state` on versions: `cooked` | `uncooked` | `not_applicable` | `both`
- [ ] When `both`: primary + alt macro columns (or jsonb); UI toggle cooked ↔ uncooked on product + log-entry
- [ ] Create/edit/search badges; seed staples; OFF default
- [ ] Version edits copy both macro blocks; **30-day owner fork** same as other foods (`ROADMAP.md` v1.2 - not in this patch)
- [ ] Feed **cook completeness** into version ranking tie-break (see `[plans/version-completeness-ranking.md](plans/version-completeness-ranking.md)`; helper ships with diary QoL **v0.7.0**)

### v0.11.0 — mother catalog, barcode grouping, admin seed (pre-launch blocker)

**Plan:** `[plans/v0.11.0-mother-catalog.md](plans/v0.11.0-mother-catalog.md)`  
(Old parent/child plan superseded: `[plans/v1.0.8-parent-catalog.md](plans/v1.0.8-parent-catalog.md)`)

**Progress:**

- [ ] Mothers = `products`; versions = `product_versions` (no third table); evolve schema/RLS/RPCs
- [ ] Scan known barcode → existing mother + ranked versions; unknown → mother + version 1 (user owns version only)
- [ ] Ranking: likes → completeness → newest; search shows versions; mother name only when browsing versions (empty → most liked version’s name)
- [ ] Visibility on **versions** (migrate off product-level visibility); private versions owner-only
- [ ] No-barcode mothers OK; attach/detach barcode on a version merges/unlinks (RPC)
- [ ] Quick-add: diary-only, never catalog rows
- [ ] Max **3 versions per owner per mother** (RPC + soft-archive oldest); safe vs diary snapshots
- [ ] Reserved usernames; admin account owns seed / staple mothers + seed versions
- [ ] **Quality admin seed (pre-launch):** Dutch ~80% staple mothers/versions under admin (content from old parent pitch). Seed rows are curated truth, not placeholders: correct **macros** (kcal + C/P/F), **EU-14 allergens** (honest `unknown` only when truly unknown), sensible portions. After **v0.14.0** / **v0.16.0** schema exists, extend/re-run seed so staples also carry correct **micros** (fiber, sugars, fats, micronutrients as known) and **halal + vegan** diet labels. Do not ship public **1.0.0** on empty/unknown-heavy admin staples.
- [ ] Update DATA_MODEL + NAMING to mother language

### v0.12.0 — version quality badge + “help improve” missing info

**Plan:** `[plans/v0.12.0-version-quality.md](plans/v0.12.0-version-quality.md)`

**Progress:**

- [ ] Visible quality badge on versions, e.g. ★★★★★ Verified → ★ Incomplete (nl/en)
- [ ] Score from: macros filled, allergens complete, barcode present, likes, users, age, reports, confirmations (likes as confirm), etc.
- [ ] Product/version open: **Help dit product verbeteren** checklist (ingredients, allergens, portions, cook state, photo, …) - Wikipedia-style community fill-in
- [ ] Align with completeness ranking helper where possible

### v0.13.0 — create product UX (allergens, names, macro sliders)

**Plan:** `[plans/v0.13.0-create-product-ux.md](plans/v0.13.0-create-product-ux.md)`

**Progress:**

- [ ] **Set remaining allergens to free (green):** one action so users do not tap every allergen twice after marking contains
- [ ] **Optional NL + EN name fields** when creating/editing a product; UI language decides which field is primary (nl → start with Dutch; en → start with English); other language optional
- [ ] Note: make sure to also translate the meal text inside the dagboek screen when changing the language
- [ ] **Create-food macro sliders:** user enters total kcal for the product (or per 100 g flow); sliders for carbs/protein/fat share that energy; grams cannot exceed product weight (e.g. 100 g product → max 100 g of a macro); show grams + kcal so create is understandable

### v0.14.0 — full nutrition fields (fiber, sugars, fats, micronutrients)

**Plan:** `[plans/v0.14.0-full-nutrition.md](plans/v0.14.0-full-nutrition.md)`

**Progress:**

- [ ] Schema + create/edit/log/reports for **fiber, sugars, salt/sodium, saturated + unsaturated fat** (and related fat fields as agreed)
- [ ] **Micronutrients** (vitamins/minerals) in DB + UI (honest unknown when missing)
- [ ] Seed / OFF mapping where available; diary snapshots include new fields when logging
- [ ] **Settings: Macro / Micro display toggle** - choose **macros only** vs **macros + micros** on **reports** and **product / food** screens. **Diary stays macros-only** always (tracker stays focused)
- [ ] **Admin staple seed:** backfill curated seed versions with accurate macro + micro nutrition (same quality bar as v0.11 seed; unknown only when data truly missing) (this is a founder 10hour task)
- [ ] Pre-public blocker (moved forward from old v1.4 salt/micros line)

### After Group E — simplify / DRY / prune

- [ ] Run **Prompt 2** in `[prompts/02-after-group-simplify.md](../../prompts/02-after-group-simplify.md)` on catalog, create/edit product, nutrition fields, quality badge helpers. DRY shared product/version logic; remove obsolete catalog paths before public **1.0.0**.

---

## Group F — Analytics & abuse (pre-public)

### v0.15.0 — analytics + password-reset abuse ops

**Plan:** `[plans/v0.15.0-analytics-abuse.md](plans/v0.15.0-analytics-abuse.md)`

**Progress:**

- [ ] Analytics integration for success metrics (`SUCCESS_METRICS.md`); privacy-aware; no PII in public docs
- [ ] Founder/ops dashboards or exports as needed
- [ ] **Forgot-password abuse (server-side preferred):** Edge Function / RPC wrapping “request reset”
  - Rate limits: per IP, per account/email (e.g. ~3 / hour, ~5 / day), spray cap so one client cannot hammer many usernames
  - Cooldown soft lock after a send (same generic “check your email” copy)
  - Progressive backoff per IP; light ~1–2s send jitter
- [ ] **Escalate bot measures (same patch; can ship gated):** CAPTCHA / Turnstile + honeypot; optional button/layout shift + same-spot tap signal; ops alert + temporary IP/device block when one IP hits many accounts
- [ ] Distinct from crash reporting (**v0.1.0** Sentry)

### After Group F — simplify / DRY / prune

- [ ] Run **Prompt 2** in `[prompts/02-after-group-simplify.md](../../prompts/02-after-group-simplify.md)` on analytics wiring + forgot-password / abuse helpers before public **1.0.0**.

---

## Group G — Diet labels (halal + vegan)

### v0.16.0 — Halal + vegan pills (same row as allergens)

**Plan:** `[plans/v0.16.0-halal-vegan.md](plans/v0.16.0-halal-vegan.md)`

**Progress:**

- [ ] Schema on product **versions**: `halal` (`unknown` | `yes` | `no`) and `vegan` (`unknown` | `vegan` | `strict_vegan` | `not_vegan`); default **unknown** when missing
- [ ] Interactive pills on create/edit: after EU-14 allergens → **Halal** → **Vegan** (same chip row); tap cycles states (no “may” middle for either)
- [ ] Profile / Settings / onboarding: **I eat halal** + **I eat vegan** (same visibility rules as allergens: only then warn/filter in search & lists)
- [ ] Show long labels in diary / search / product where allergens already show; short names on chips + legend
- [ ] Open Food Facts import: map what OFF provides; else leave **unknown**
- [ ] **Admin staple seed:** set correct **halal** + **vegan** on curated seed versions (not left `unknown` when the food is known); together with v0.11/v0.14 this completes quality seed = macros + micros + allergens + diet labels
- [ ] i18n nl/en for all states; honesty: never invent yes/vegan from missing data

### After Group G — simplify / DRY / prune

- [ ] Run **Prompt 2** in `[prompts/02-after-group-simplify.md](../../prompts/02-after-group-simplify.md)` on allergen/diet chip UI + profile preference helpers.

---

## Released

### v0.3.0 — Settings identity, dates + GDPR

**App version:** `0.3.0` · See `CHANGELOG.md` · tag when founder commits + tags

- [x] Username / password / email change in Settings
- [x] Native date picker + date format preference
- [x] Diary + reports date jump; GDPR export + soft-delete / 30-day purge cron

### v0.2.0 — auth emails + forgot password

**App version:** `0.2.0` · See `CHANGELOG.md` · tag `v0.2.0`

- [x] Forgot / reset password flow + deep link callback
- [x] Paste-ready branded email templates
- [x] SETUP: Confirm email + redirect URL checklist

*Founder Expo Go still uses localhost Site URL + tunnel for reset. **Production Auth URLs, custom SMTP, HTTPS landing, and store-build*** `macrio://` ***smoke** ship at public* `ROADMAP.md` ***→ v1.0.0** (do not leave localhost /* `exp://` *for real users).*

### v0.1.0 — crash reporting (Sentry)

**App version:** `0.1.0` · See `CHANGELOG.md` · tag `v0.1.0`

- [x] `@sentry/react-native` + optional DSN; Settings smoke test in `__DEV__`
- [x] Expo / Metro plugins for future source maps; SETUP docs
- [ ] *(Ops)* Create Sentry account / start trial at **public v1.0.0** launch - see `ROADMAP.md` (do not burn trial during pre-public)

### Founder MVP (historical; formerly labeled `1.0.0`)

**Core MVP:** checklist in `[ROADMAP.md](ROADMAP.md)` “Founder MVP”.

**Also shipped during founder testing (no 0.x bump yet):**

- [x] Goal calculator (Mifflin-St Jeor) in onboarding + Settings
- [x] Username sign-up / login; profile grants fix (migration 009)
- [x] Add barcode later (type/scan, migration 010)
- [x] Scanner viewfinder + double-read confirm; EAN-13 normalize; edit/delete barcode (migration 011)
- [x] Barcode check digit + EAN/UPC/GS1-128 help on add/edit (migration 012)
- [x] Recents: dedupe by product, each user's last-logged version
- [x] Product report sheet (modal; fixes Android 3-button limit)
- [x] App version in Settings + feedback metadata
- [x] Product visibility public/private (create checkbox + owner toggle; migration 013); scan prefers public
- [x] Diary macro header: progress bars, focus swipe, long-press to overview
- [x] Allergen `may_contain` / kan bevatten (orange) + mother-catalog plan docs

---

## Rejected / deferred


| Item                                                                                                 | Reason                                                                                  |
| ---------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| Feedback: multiple screenshots (max 5)                                                               | Keep single image for now. Also listed under Old notes.                                 |
| Refer a friend / invite                                                                              | `ROADMAP.md` v1.4                                                                       |
| App Store / Play review prompt after ~7 days use                                                     | `ROADMAP.md` v1.0.0 launch                                                              |
| Health-synced weight → auto kcal + g/kg macros (carbs fill rest)                                     | `ROADMAP.md` v1.2 (after Health sync)                                                   |
| Quick-log % macro sliders (restaurant)                                                               | `ROADMAP.md` v1.3                                                                       |
| Personal reorder of add-food tabs                                                                    | `ROADMAP.md` v1.3                                                                       |
| Water tracker / daily diary notes / meal reminders / home widgets                                    | `ROADMAP.md` v1.3 (post-public)                                                         |
| Food-logging streaks, freezers, coins, avatar store, community badges                                | `ROADMAP.md` v1.4                                                                       |
| Themed seasonal events (Christmas, Halloween, etc.)                                                  | `ROADMAP.md` v1.4                                                                       |
| Auto-trim low-like product versions (beyond per-owner cap)                                           | `ROADMAP.md` v1.2                                                                       |
| 30-day version edit fork / profile visibility slider / duplicate-from-version / multi-admin merge UI | `ROADMAP.md` v1.2                                                                       |
| Recipes, community duplicate meals                                                                   | `ROADMAP.md` v1.4                                                                       |
| Personal meal templates + meal planner + meal/ingredient photos                                      | `ROADMAP.md` v1.3                                                                       |
| Salt / fiber / micros (old v1.4 line)                                                                | **Moved** to pre-public **v0.14.0**                                                     |
| Analytics / success metrics + forgot-password abuse (limits, CAPTCHA, ops)                           | **Moved** to pre-public **v0.15.0**                                                     |
| Crash reporting                                                                                      | **Moved** to pre-public **v0.1.0**                                                      |
| Account delete + data export (GDPR)                                                                  | **Moved** to pre-public **v0.3.0**                                                      |
| Metric / imperial (and optional kJ) display units                                                    | `ROADMAP.md` v1.3 (after date-format preference in **v0.3.0**)                          |
| Supporter pay-what-you-want + quarterly in-app funding notices                                       | `ROADMAP.md` v1.5                                                                       |
| Production auth: HTTPS Site URL, custom SMTP, `macrio://` reset/confirm (leave localhost / Expo Go)  | `ROADMAP.md` v1.0.0 + `RELEASE_CHECKLIST.md`                                            |
| AI photo + AI coach                                                                                  | `ROADMAP.md` v2.0                                                                       |
| User feedback at scale (replies, status, dedupe)                                                     | Not decided — `[community-feedback-future.md](../founder/community-feedback-future.md)` |


