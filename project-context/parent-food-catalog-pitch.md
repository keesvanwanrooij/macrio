# Pitch: parent food catalog + Dutch ~80% base (pre-launch)

> Working brief for a later session with a **premium AI model**. Goal: design and fill a clean parent-food base for the Dutch market before public launch so community data does not turn into a mess. Product home: Macrio (`ROADMAP_MINOR.md` → **v1.0.8**; depends on **v1.0.7** cook state).

---

## One-liner

Ship **locked parent foods** (system-owned) that cover ~**80% of everyday Dutch eating**, with complete macros/allergens/portions; let the community add **child** products/versions under those parents (or stay parentless when needed).

## Why before public launch

- Without parents, every “appel”, “AH appel”, “Elstar” becomes a disconnected row. Search, likes, and allergen honesty get noisy fast.
- After launch, fixing structure means migrations + user confusion. Cheaper to seed well once.
- Open Food Facts helps barcodes; it does not give you a curated Dutch staple hierarchy.

## Product rules (draft — refine with premium model)

Canonical naming (UI + docs): [`docs/product/NAMING.md`](../docs/product/NAMING.md).

1. **Parents** are created only by Macrio (seed / admin). Users cannot invent new parents in v1.0. In the **UI** call them **Staple / Standaard**, not “parent”.
2. Users **can** create product versions (and child products) **linked to a parent**, e.g. parent `Beenham` → `AH Ovenschotel beenham honing mosterd`. Brand SKUs are never parents.
3. Users **may** create items **without** a parent when nothing fits (edge cases, restaurant dishes, weird brands) — do not force bad links.
4. Parents should be **generic staples** (appel, kipfilet, beenham, zilvervliesrijst), not supermarket SKUs.
5. Each parent needs **complete, honest data**: kcal + macros per 100 g (or ml), EU-14 allergens (`contains` / `free` / `unknown` — never guess `free`), sensible default portions (and later S/M/L from v1.0.6), and **cook_state** (`cooked` | `uncooked` | `not_applicable`) from v1.0.7 — critical for rice, pasta, meat, etc. Prefer separate parents or clear child versions when both raw and cooked references are common.
6. Diary entries keep **snapshots** of the version used; parent links are for discovery and governance, not rewriting history.
7. **Price** is not part of the parent seed MVP; community prices-per-country are a later optional feature (`ROADMAP.md` v1.4).

## Success = ~80% coverage (Dutch first)

“80%” means: for a typical week of Dutch home + supermarket + common out-of-home eating, most log lines resolve to a parent (or a child under a parent) without the user creating a one-off orphan.

Prioritize categories that dominate real plates, for example (illustrative — model should expand and rank):

- Dairy & alternatives (melk, yoghurt, kaas, havermelk, …)
- Bread & breakfast (bruin/wit brood, hagelslag, pindakaas, …)
- Staple carbs (rijst, pasta, aardappel, wraps, …)
- Proteins (kip, gehakt, ei, tofu, vis common types, …)
- Fruit & veg (appel, banaan, tomaat, komkommer, …)
- Spreads, sauces, oils used daily
- Common drinks (water need not be fancy; koffie/thee/frisdrank patterns)
- Ready patterns Dutch people actually buy (think AH/Jumbo staples at **parent** level of abstraction, not every SKU)

EN names for bilingual UI; NL as primary market language for seed labels where it helps search.

## What to ask the premium model (session checklist)

Use this file as the system/user brief. Ask it to:

1. Propose a **data-model sketch** compatible with current Macrio tables (`products`, `product_versions`, likes, allergens JSON) — e.g. `parent_product_id`, `is_system_parent`, constraints, RLS notes.
2. Output a **ranked parent list** (~N items) aimed at Dutch 80% coverage, grouped by category, with merge rules (“when is something a parent vs a child?”).
3. For each parent (or for the top tier first): draft **macros per 100 g/ml**, **cook_state**, **EU-14 allergen map**, **default portions**, nl/en names, notes on uncertainty (`unknown` where data is weak). Call out pairs that need both cooked and uncooked entries.
4. Flag conflicts with **Open Food Facts** import (barcode children under generic parents).
5. Propose a **seed format** Macrio can load (SQL or JSON matching existing seed style).
6. Call out **legal / honesty** risks (allergen guessing, medical claims) per `docs/product/LEGAL.md`.
7. Suggest a **human review** pass (founder) before any production seed merge.

## Out of scope for this pitch

- Trust graph / weighted likes (v1.2) — parents ship earlier; governance layers later.
- Auto-trimming old versions (also v1.2).
- AI photo logging (v2.x paid).
## Pointers in-repo

- Patch home: `docs/product/ROADMAP_MINOR.md` → v1.0.8 (after v1.0.7 cook state)
- Major list: `docs/product/ROADMAP.md` → v1.0.x
- Schema: `docs/architecture/DATA_MODEL.md`, `backend/supabase/migrations/`
- Existing seed: `backend/supabase/migrations/002_seed.sql`
- Allergen honesty: `docs/product/LEGAL.md`

## Founder decision (already taken)

- Do this **inside v1.0.x before public launch**.
- Use a **premium AI** later to fill the base; this file is the handoff pitch.
- Dutch market first; English labels for bilingual UI.
