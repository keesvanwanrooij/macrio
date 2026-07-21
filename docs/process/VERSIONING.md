# Versioning & Releases

## Scheme

`MAJOR.MINOR.PATCH`

- **Major:** new product areas (v2.0 = community/social).
- **Minor:** new features within existing areas (v1.1 workouts, v1.2 trust, …).
- **Patch (v1.0.x):** food-logging polish before/after public launch — see `ROADMAP_MINOR.md`.

## Current version: **1.0.0**

Founder testing. **Do not bump** `app/app.json`, `app/package.json`, or root `VERSION` for every fix or partial feature.

**Bump PATCH only when you ship a named patch** (v1.0.1, v1.0.2, …):

1. Finish the patch scope in `ROADMAP_MINOR.md` (checkboxes complete).
2. Update `CHANGELOG.md`.
3. Set version in **all** of: `app/app.json`, `app/package.json`, root `VERSION`.
4. Git tag `v1.0.1` (etc.) on `main`.

Settings and feedback metadata read version from `app.json` via `expo-constants` (`app/src/lib/appMeta.ts`).

## Where version lives (keep in sync on release)

| File | Role |
|---|---|
| `app/app.json` → `expo.version` | **Source of truth** (Expo / stores) |
| `app/package.json` → `version` | npm / tooling |
| `VERSION` (repo root) | Quick read for git / docs |
| Git tag `vX.Y.Z` | Released snapshot |

## Cadence

- v1.0 MVP built in one long work session — still **1.0.0** until first patch tag.
- After launch: minors planned per feedback cycle (`FEEDBACK_LOOP.md`), no fixed calendar.

## Mechanics

- Release steps: `RELEASE_CHECKLIST.md`.
- Roadmap checklists track **done work**; version bumps track **released** patches only.
