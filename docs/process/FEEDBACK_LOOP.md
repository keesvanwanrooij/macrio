# Community Feedback Loop

## Sources

1. **In-app feedback** (v1.0): free text + optional screenshot + auto metadata (app version, session seconds, days since install). Stored in Supabase `feedback` table.
2. GitHub issues (bug/feature templates).
3. Success metrics (`docs/product/SUCCESS_METRICS.md`).

## Why the metadata matters

- *Session time* separates power users from first-impressions feedback.
- *Days since install* distinguishes onboarding friction (day 0–1) from long-term needs.
- *Screenshots* remove the "which screen do you mean?" round-trip.

## Cycle (per minor release)

1. Export & cluster feedback by theme (screen, feature, sentiment).
2. Cross-check clusters against metrics (e.g. "not found" scan rate vs database complaints).
3. Re-rank `ROADMAP.md`; publish the plan as a GitHub milestone so the community sees what feedback did.
4. Ship, tag, changelog; announce in release notes which feedback items were addressed.

## Principle

Feedback is a vote. As the trust graph matures (v1.2+), feedback weighting can use the same reliability machinery as data governance.
