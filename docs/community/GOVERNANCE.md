# Community Governance

> Data governance ships v1.2; people governance (social features) ships v2.0. Design details in `docs/architecture/TRUST_GRAPH.md`.

## Philosophy

Macrio runs without developer interference. The community is the moderator, through trust-weighted majority votes.

## Data governance (v1.2)

- Product entries are versioned; the trust-weighted most-liked version is shown by default.
- Reports past a trust-weighted threshold trigger a community vote: keep / rollback / delete.
- Same machinery later applies to exercises and pinned tutorial videos (v1.1+ content).

## People governance (v2.0)

- Trust-weighted majority votes can mute/timeout users in community spaces.
- Progressive penalties: first offense 1 day, building up with repeat offenses; no reset of the record.
- Vote weights recalibrate monthly; timeout history is permanent and visible on the profile.

## Project governance (open source)

- Maintainer (founder) merges PRs and holds keys in the bootstrap phase.
- Goal: move project decisions toward the same community-vote model as the app matures.
