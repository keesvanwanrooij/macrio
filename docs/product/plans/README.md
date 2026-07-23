# Plans

> Working docs for roadmap items. **Roadmaps stay the index**; plans hold the structured build notes.

## How this fits

| Layer | Role |
|---|---|
| `docs/founder/notes.md` | Raw founder scratchpad |
| `docs/product/ROADMAP_MINOR.md` | Pre-public **0.x** patch board + ship order |
| `docs/product/ROADMAP.md` | Public **1.0.0** + majors **1.1+** / **2.0** |
| **`docs/product/plans/`** | One plan file per patch/feature |

## Workflow

1. Triage notes or feedback → assign to a 0.x patch or a major.
2. Tick `[x]` on progress items as you ship.
3. When a **full patch** is done: bump app to that **0.x.y** (or **1.0.0** at public), tag git, move block to **Released**, update `CHANGELOG.md`. See [`VERSIONING.md`](../../process/VERSIONING.md).

**Feedback:** triage into [`ROADMAP_MINOR.md`](ROADMAP_MINOR.md) or [`notes.md`](../founder/notes.md)

## Naming

- Plan files: `v0.N.0-slug.md` matching ship number (pre-public board)
- Majors: `v1.1-workouts.md`, etc.
- Template: `_TEMPLATE.md` (do not delete)
- Legacy stubs may remain as redirects

## Current pre-public plans (ship order)

| Ship | Plan file |
|---|---|
| **Group A — ops & account** | |
| v0.1.0 | [crash reporting](v0.1.0-crash-reporting.md) |
| v0.2.0 | [auth emails](v0.2.0-auth-emails.md) |
| v0.3.0 | [Settings identity + dates + GDPR](v0.3.0-settings-identity-gdpr.md) _(stubs: [identity](v1.0.3-settings-identity.md), [GDPR](v1.0.3-gdpr-account.md))_
| **Group B — goals** | |
| v0.4.0 | [onboarding & goals](v0.4.0-onboarding-goals.md) |
| v0.4.1 | [macro modes Simple / Athlete / Keto](v0.4.1-macro-modes.md) |
| **Group C — diary & reports** | |
| v0.5.0 | [diary progress](v0.5.0-diary-progress.md) |
| v0.6.0 | [report coaching texts](v0.6.0-report-coaching.md) |
| v0.7.0 | [diary & search QoL](v0.7.0-diary-search-qol.md) |
| **Group D — portions** | |
| v0.8.0 | [portion units](v0.8.0-portion-units.md) |
| v0.9.0 | [named portions](v0.9.0-named-portions.md) |
| **Group E — catalog & nutrition** | |
| v0.10.0 | [cook state](v0.10.0-cook-state.md) |
| v0.11.0 | [mother catalog](v0.11.0-mother-catalog.md) |
| v0.12.0 | [version quality + missing info](v0.12.0-version-quality.md) |
| v0.13.0 | [create product UX](v0.13.0-create-product-ux.md) |
| v0.14.0 | [full nutrition / micros](v0.14.0-full-nutrition.md) |
| **Group F — analytics & abuse** | |
| v0.15.0 | [analytics + password-reset abuse](v0.15.0-analytics-abuse.md) |
| **Group G — diet labels** | |
| v0.16.0 | [halal + vegan pills](v0.16.0-halal-vegan.md) |
| (cross-patch) | [version completeness ranking](version-completeness-ranking.md) |

## Major / later plans

| Item | Plan |
|---|---|
| v1.3 allergen reports | [allergen-reports](allergen-reports.md) |
