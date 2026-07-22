# Community Feedback Loop

## Sources

1. **In-app feedback** (v1.0): free text + optional screenshot + auto metadata (app version, session seconds, days since install). Stored in Supabase `feedback` table.
2. **GitHub issues** (bugs/features).
3. Success metrics (`docs/product/SUCCESS_METRICS.md`).

Product **melden** (wrong macros/allergens) is **not** feedback — it goes to the `reports` table for moderation, not the roadmap inbox.

## Triage (founder, now)

1. Read Supabase **Table Editor → `feedback`** and open GitHub issues.
2. Promote each item to **Inbox** or **Planned** in [`ROADMAP_MINOR.md`](../product/ROADMAP_MINOR.md), [`ROADMAP.md`](../product/ROADMAP.md), [`notes.md`](../context/notes.md) (founder ideas), or a dedicated file under `docs/context/`.
3. Delete the Supabase row or close the GitHub issue once captured.
4. Tick progress in the roadmap checklists; bump **app version + git tag only when a patch ships** (`VERSIONING.md`).

## Why the metadata matters

- *Session time* separates power users from first-impressions feedback.
- *Days since install* distinguishes onboarding friction (day 0–1) from long-term needs.
- *Screenshots* remove the "which screen do you mean?" round-trip.
- *App version* ties feedback to what build they ran (founder builds may still show **1.0.0**; next shipped patches are **0.x**, then public **1.0.0**).

## Cycle (per minor release)

1. Export & cluster feedback by theme (screen, feature, sentiment).
2. Cross-check clusters against metrics (e.g. "not found" scan rate vs database complaints).
3. Re-rank `ROADMAP.md`; publish the plan as a GitHub milestone so the community sees what feedback did.
4. Ship, tag, changelog; announce in release notes which feedback items were addressed.

## Later (not decided)

Problem and options: [`docs/context/community-feedback-future.md`](../context/community-feedback-future.md). Nothing committed to the roadmap until we pick an approach.

## Principle

Feedback is a vote. As the trust graph matures (v1.2+), feedback weighting can use the same reliability machinery as data governance.
