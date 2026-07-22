# Versioning & Releases

## Scheme

`MAJOR.MINOR.PATCH` (what people usually expect)

| Range | Meaning |
|---|---|
| **0.x.y** | Pre-public. API and UX may change freely. Patches on the minor board: `0.1.0` … `0.14.0`. |
| **1.0.0** | First **public** release (stores / open users). |
| **1.1+** | New product areas after public (`ROADMAP.md`: workouts, trust, community, …). |
| **2.0** | Paid intelligence (AI photo + AI coach). |

Pre-public detail: [`docs/product/ROADMAP_MINOR.md`](../product/ROADMAP_MINOR.md).  
Post-public majors: [`docs/product/ROADMAP.md`](../product/ROADMAP.md).

## Current app label: **1.0.0** (founder era)

Early builds used `1.0.0` before this scheme. Treat that as **pre-1.0 history**, not “public 1.0”.

**Do not bump** `app/app.json`, `app/package.json`, or root `VERSION` for every fix.

**When you ship a named pre-public patch:**

1. Finish the patch scope in `ROADMAP_MINOR.md` (checkboxes complete).
2. Update `CHANGELOG.md`.
3. Set version in **all** of: `app/app.json`, `app/package.json`, root `VERSION` to the patch id (next closed patch → **`0.1.0`**, then `0.2.0`, …).
4. Git tag `v0.1.0` (etc.) on `main`.

**When the 0.x board is done and you go public:** bump to **`1.0.0`**, tag `v1.0.0`, update changelog / store listing.

Settings and feedback metadata read version from `app.json` via `expo-constants` (`app/src/lib/appMeta.ts`).

## Where version lives (keep in sync on release)

| File | Role |
|---|---|
| `app/app.json` → `expo.version` | **Source of truth** (Expo / stores) |
| `app/package.json` → `version` | npm / tooling |
| `VERSION` (repo root) | Quick read for git / docs |
| Git tag `vX.Y.Z` | Released snapshot |

Also bump store **build numbers** (iOS / Android) on every upload even if marketing version is unchanged.

## Cadence

- Founder MVP was built under the old `1.0.0` label; next shipped board item is **`0.1.0`**.
- After public `1.0.0`: plan minors per feedback cycle (`FEEDBACK_LOOP.md`), no fixed calendar.

## Mechanics

- Release steps: `RELEASE_CHECKLIST.md`.
- Roadmap checklists track **done work**; version bumps track **released** patches only.
