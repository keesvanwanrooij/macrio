# Versioning & Releases

## Scheme

`MAJOR.MINOR.PATCH` (what people usually expect)

| Range | Meaning |
|---|---|
| **0.x.y** | Pre-public. API and UX may change freely. Patches on the minor board: `0.1.0` … `0.16.0`. |
| **1.0.0** | First **public** release (stores / open users). |
| **1.1+** | New product areas after public (`ROADMAP.md`: workouts, trust, community, funding, …). |
| **2.0** | Paid intelligence (AI photo + AI coach). |

Pre-public detail: [`docs/product/ROADMAP_MINOR.md`](../product/ROADMAP_MINOR.md).  
Post-public majors: [`docs/product/ROADMAP.md`](../product/ROADMAP.md).

## Current app label: **0.2.0**

Pre-public patches: **0.1.0** (Sentry), **0.2.0** (auth emails). Early founder builds used `1.0.0` before the 0.x scheme.

**Do not bump** Expo config / `package.json` / `VERSION` for every fix.

**When you ship a named board version (required):**

1. Finish the patch scope in `ROADMAP_MINOR.md` or the major in `ROADMAP.md` (checkboxes complete).
2. Update `CHANGELOG.md`.
3. Set version in **all** of: `app/app.config.js` → `expo.version`, `app/package.json`, root `VERSION`.
4. Commit the release on `main` (when asked).
5. **Always** create an annotated git tag on that commit: `git tag -a v0.1.0 -m "…"` (same for `v0.2.0`, `v1.0.0`, …). A completed minor/patch without a tag is incomplete.
6. Push the tag only when the founder asks (`git push origin v0.1.0` or `--tags`).

**When the 0.x board is done and you go public:** bump to **`1.0.0`**, tag `v1.0.0`, update changelog / store listing.

Settings and feedback metadata read version from Expo config via `expo-constants` (`app/src/lib/appMeta.ts`).

## Where version lives (keep in sync on release)

| File | Role |
|---|---|
| `app/app.config.js` → `expo.version` | **Source of truth** (Expo / stores) |
| `app/package.json` → `version` | npm / tooling |
| `VERSION` (repo root) | Quick read for git / docs |
| Git tag `vX.Y.Z` | **Required** released snapshot for each completed board version |

Also bump store **build numbers** (iOS / Android) on every upload even if marketing version is unchanged.

## Cadence

- Pre-public: one board patch → one app bump → one annotated tag.
- After public `1.0.0`: plan minors per feedback cycle (`FEEDBACK_LOOP.md`), no fixed calendar.

## Mechanics

- Release steps: `RELEASE_CHECKLIST.md`.
- Roadmap checklists track **done work**; version bumps + **tags** track **released** board versions only.
