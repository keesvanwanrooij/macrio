# ADR-002: Supabase (PostgreSQL) as backend

- Status: accepted · 2026-07-21

## Context

The app is heavily relational: users → reliability scores → votes on product versions; posts in groups by users; automated community moderation. Candidates: Supabase (SQL) vs Firebase (NoSQL).

## Decision

Supabase: Postgres + Auth + Storage + Row Level Security; Edge Functions where needed. EU region hosting (GDPR).

## Reasons

1. **Trust graph & voting are relational math.** Weighted vote scores are simple SQL joins/aggregates; in Firebase this is a live-computation and data-duplication nightmare where a product edit would need updates in dozens of denormalized places (risking wrong calorie counts).
2. **Community structures are hard relations.** Facebook-like posts, WhatsApp-like groups with admins, Discord-like channels (v1.4) map directly onto relational tables.
3. **Developer-free democracy needs database rules.** Automated mutes/timeouts after X votes are Postgres triggers and functions — no server babysitting.
4. **Auth included:** email + Google + Apple sign-in out of the box (account required at startup).
5. **Storage included:** product photos and feedback screenshots.

## Consequences

- Vendor-managed Postgres; mitigated by Supabase itself being open source (self-hosting escape hatch fits the AGPL project ethos).
- v1.0 is online-required; offline-first sync is a later architecture task (`OFFLINE_SYNC.md`).
