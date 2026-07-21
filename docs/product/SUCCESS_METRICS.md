# Success Metrics

> Measured via Supabase queries + in-app feedback metadata. No third-party analytics in v1.0 (privacy-first).

## North star

**Days with ≥1 logged meal per active user per week** — the app only helps if logging is habitual.

## v1.0 targets (first 3 months after launch)

| Metric | Target | Why |
|---|---|---|
| D7 retention | ≥ 25% | Logging habit forms in week 1 |
| Median time to log a scanned product | ≤ 10 s | Core USP: fastest logging |
| Products created by community | ≥ 100 | Validates create-flow + community model |
| % scans resulting in "not found" | trending down | Database coverage improving |
| Feedback submissions | ≥ 30 | Enough signal to plan v1.1 |
| Crash-free sessions | ≥ 99% | Basic quality bar |

## Guardrails

- Account deletion works end-to-end (GDPR) — zero unresolved deletion requests.
- Allergen "unknown" shown honestly — zero false "free" claims reported.

## Review cadence

Metrics reviewed at each minor release planning session; roadmap priorities re-ordered by feedback volume + metric movement (see `docs/process/FEEDBACK_LOOP.md`).
