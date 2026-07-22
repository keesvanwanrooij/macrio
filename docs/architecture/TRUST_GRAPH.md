# Trust Graph & Community Governance — design notes (build target: v1.2)

> v1.0 ships the simple layer (versions + likes + report queue). This documents the target system so the v1.0 schema doesn't paint us into a corner.

## Principles

1. Reliable users' votes weigh more; trolls converge to zero weight.
2. The app runs without developer interference: community majority (trust-weighted) is the moderator.
3. Everything is transparent: weights, votes, and outcomes are inspectable.

## Trust score (per user)

- Grows with: accepted product versions (their version becomes/stays default), likes received from high-trust users, reports they filed that the community upheld.
- Shrinks with: their content deleted by community vote, reports against them upheld, spam signals.
- New users start with a small positive weight (can contribute, can't dominate).
- Score is recomputed by scheduled Postgres function; vote weight = f(trust) with cap so no single user dominates.

## Data version governance

- Default product version = highest **trust-weighted** like score (v1.0 uses raw likes; same column, new formula).
- Reports trigger a vote when report count (trust-weighted) passes threshold → outcome: keep / rollback to earlier version / delete entry.

## Community moderation (v1.4, people not data)

- Majority vote can mute/timeout users; progressive durations (1 day, building up), vote weights reset monthly, timeout history permanent on profile.
- Same weighted-vote machinery reused from data governance.

## Anti-abuse

- Sybil resistance: trust grows slowly and only through actions validated by already-trusted users.
- Caps + monthly decay prevent aristocracy; inactivity decays trust slowly.
- All thresholds stored in a `governance_config` table — tunable without app releases, and (later) itself community-votable.
