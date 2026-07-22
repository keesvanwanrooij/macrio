# Plans

> Working docs for roadmap items. **Roadmaps stay the index**; plans hold the structured build notes.

## How this fits

| Layer | Role |
|---|---|
| `project-context/notes.md` | Raw founder scratchpad |
| `docs/product/ROADMAP_MINOR.md` | Pre-public **0.x** patch board + ship order |
| `docs/product/ROADMAP.md` | Public **1.0.0** + majors **1.1+** / **2.0** |
| **`docs/product/plans/`** | One plan file per patch/feature |

## Workflow

1. Triage notes or feedback → assign to a 0.x patch or a major.
2. Tick `[x]` on progress items as you ship.
3. When a **full patch** is done: bump app to that **0.x.y** (or **1.0.0** at public), tag git, move block to **Released**, update `CHANGELOG.md`. See [`VERSIONING.md`](../../process/VERSIONING.md).

**Feedback:** triage into [`ROADMAP_MINOR.md`](ROADMAP_MINOR.md) or [`notes.md`](../../project-context/notes.md)

## Naming

- New plan files: prefer `v0.N.0-slug.md` matching ship number
- Older files may keep a former `v1.0.x` filename; **`ROADMAP_MINOR.md` headings are authoritative**
- Majors: `v1.1-workouts.md`, etc.
- Template: `_TEMPLATE.md` (do not delete)

## Current pre-public plans (ship order)

| Ship | Plan file |
|---|---|
| **Group A — ops & account** | |
| v0.1.0 | [crash reporting](v1.0.1-crash-reporting.md) |
| v0.2.0 | [auth emails](v1.0.2-auth-emails.md) |
| v0.3.0 | [Settings identity](v1.0.3-settings-identity.md) + [GDPR delete/export](v1.0.3-gdpr-account.md) |
| **Group B — goals** | |
| v0.4.0 | [onboarding & goals](v1.0.4-onboarding-goals.md) |
| **Group C — diary & reports** | |
| v0.5.0 | [diary progress](v1.0.5-diary-progress.md) |
| v0.6.0 | [report coaching texts](v1.0.6-report-coaching.md) |
| v0.7.0 | [diary & search QoL](v1.0.10-diary-search-qol.md) _(filename legacy)_ |
| **Group D — portions** | |
| v0.8.0 | [portion units](v1.0.1-portion-units.md) _(filename legacy)_ |
| v0.9.0 | [named portions](v1.0.6-named-portions.md) _(filename legacy)_ |
| **Group E — catalog & nutrition** | |
| v0.10.0 | [cook state](v1.0.7-cook-state.md) _(filename legacy)_ |
| v0.11.0 | [mother catalog](v1.0.8-mother-catalog.md) _(filename legacy)_ |
| v0.12.0 | [version quality + missing info](v1.0.12-version-quality.md) |
| v0.13.0 | [create product UX](v1.0.9-create-product-ux.md) _(filename legacy)_ |
| v0.14.0 | [full nutrition / micros](v1.0.14-full-nutrition.md) |
| (cross-patch) | [version completeness ranking](version-completeness-ranking.md) |

## Major / later plans

| Item | Plan |
|---|---|
| v1.3 allergen reports | [allergen-reports](allergen-reports.md) |
