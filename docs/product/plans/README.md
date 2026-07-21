# Plans

> Working docs for roadmap items. **Roadmaps stay the index**; plans hold the structured build notes.

## How this fits

| Layer | Role |
|---|---|
| `project-context/notes.md` | Raw founder scratchpad |
| `docs/product/ROADMAP_MINOR.md` | Patch board + ship order (v1.0.x) |
| `docs/product/ROADMAP.md` | Major versions (v1.1+) |
| **`docs/product/plans/`** | One plan file per patch/feature: scope, acceptance, open questions, impl notes |

## Workflow

1. Triage notes → `ROADMAP_MINOR.md` / `ROADMAP.md`.
2. Open or create `plans/vX.Y.Z-slug.md` (copy `_TEMPLATE.md`).
3. Fill **Problem / Scope / Acceptance** before coding; add **Impl notes** while building.
4. When shipped: mark plan status **Done**, move the patch block to **Released** in `ROADMAP_MINOR.md`, update `CHANGELOG.md`.

## Naming

- Patches: `v1.0.1-portion-units.md`
- Majors (when needed): `v1.1-workouts.md`, `v1.3-quick-log-sliders.md`
- Template: `_TEMPLATE.md` (do not delete)

## Current pre-public plans (ship order)

| Patch | Plan |
|---|---|
| v1.0.1 | [portion units + default 100](v1.0.1-portion-units.md) |
| v1.0.2 | [auth emails + forgot password](v1.0.2-auth-emails.md) |
| v1.0.3 | [Settings identity & dates](v1.0.3-settings-identity.md) |
| v1.0.4 | [onboarding & goals UX](v1.0.4-onboarding-goals.md) |
| v1.0.5 | [diary meal totals & progress](v1.0.5-diary-progress.md) |
| v1.0.6 | [named portions](v1.0.6-named-portions.md) |
| v1.0.7 | [cook state](v1.0.7-cook-state.md) |
| v1.0.8 | [parent catalog + Dutch seed](v1.0.8-parent-catalog.md) |
