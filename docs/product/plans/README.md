# Plans

> Working docs for roadmap items. **Roadmaps stay the index**; plans hold the structured build notes.

## How this fits

| Layer | Role |
|---|---|
| `project-context/notes.md` | Raw founder scratchpad |
| `docs/product/ROADMAP_MINOR.md` | Patch board + ship order (v1.0.x); reorder freely |
| `docs/product/ROADMAP.md` | **Major versions only** (v1.1+) |
| **`docs/product/plans/`** | One plan file per patch/feature: scope, acceptance, open questions, impl notes |

## Workflow

1. Triage notes or feedback → assign to a patch release or reject (with reason).
2. Tick `[x]` on progress items in `ROADMAP_MINOR.md` / `ROADMAP.md` as you ship.
3. When a **full patch** is done: bump version, tag git, move block to **Released**, update `CHANGELOG.md`.

**Feedback:** triage into [`ROADMAP_MINOR.md`](ROADMAP_MINOR.md) **Inbox** or [`notes.md`](../../project-context/notes.md)

## Naming

- Patches: `v1.0.1-portion-units.md`
- Majors (when needed): `v1.1-workouts.md`, `v1.5-analytics.md`
- Template: `_TEMPLATE.md` (do not delete)

## Current pre-public plans (ship order)

| Patch | Plan |
|---|---|
| v1.0.1 | [portion units + default 100](v1.0.1-portion-units.md) |
| v1.0.2 | [auth emails + forgot password](v1.0.2-auth-emails.md) |
| v1.0.3 | [Settings identity & dates](v1.0.3-settings-identity.md) |
| v1.0.4 | [onboarding & goals UX + g/kg sliders](v1.0.4-onboarding-goals.md) |
| v1.0.5 | [diary meal totals & progress](v1.0.5-diary-progress.md) |
| v1.0.6 | [named portions](v1.0.6-named-portions.md) |
| v1.0.7 | [cook state](v1.0.7-cook-state.md) |
| v1.0.8 | [parent catalog + Dutch seed](v1.0.8-parent-catalog.md) |
| v1.0.9 | [create product UX](v1.0.9-create-product-ux.md) |
| v1.0.10 | [diary & search QoL](v1.0.10-diary-search-qol.md) |

## Major / later plans

| Item | Plan |
|---|---|
| v1.3 allergen reports | [allergen-reports](allergen-reports.md) |
