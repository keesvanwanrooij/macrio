# Minor & Patch Planning — current cycle

> Planning board for improvements within the current minor version (e.g. v1.1 → v1.1.1, v1.1.2 …), fed by founder notes (`project-context/`) and community feedback (in-app + GitHub issues). Big features stay in `ROADMAP.md`; this file is for the small, fast iterations between them.

## How to use this file

1. Collect raw notes and feedback below under **Inbox**.
2. Each planning pass: triage Inbox items → assign to a patch release or reject (with reason).
3. Ship, move the block to **Released**, update `CHANGELOG.md`.

## Inbox (untriaged)

_—_

## Planned

### v1.0.1 — portion units (g / ml)

**Found during:** Supabase seed review (founder testing setup).

**Problem:** All products and portions use grams only. Liquids (melk, cola, sap, bier, wijn) should show **ml** (e.g. "1 glas – 250 ml"), not "250 g". Nutrition labels for drinks are per 100 ml, not 100 g.

**Quick fix (this patch):**
- Add `unit: 'g' | 'ml'` on portion objects in JSONB (no SQL migration — `portions` is already flexible).
- Update seed data (`002_seed.sql`) for liquid staples.
- UI: portion picker, product page, and create-product show ml where `unit === 'ml'`.
- Macro math: keep per-100g internally for now; for water-like liquids 1 ml ≈ 1 g (acceptable for v1.0.1).

**Affected seed items:** halfvolle/volle melk, havermelk, cola, sinaasappelsap, bier, rode wijn.

### v1.0.2
_—_

## Released

_—_

## Rejected / deferred

| Item | Reason |
|---|---|
| _—_ | |
