# Macrio — Product Requirements Document

> Version 1.0 · 2026-07-21 · Owner: founder

## Problem

People who track calories/macros AND manage food allergies (gluten-free first) have no single good app. Existing trackers suffer paywall creep, database rot, painful product creation, and no allergen trust. Gluten-scanner apps have tiny, unverified databases. Workout apps cap free features. Nobody combines food + allergens + fitness.

## Vision

An open-source (AGPL-3.0), bilingual (nl/en), community-governed food & fitness tracker. The community owns and moderates the data through versioning, likes, and (later) a weighted trust graph. Free forever for core features; funded by GitHub Sponsors donations.

## Goals (v1.0)

1. Log food faster than any competitor: barcode scan → log in under 10 seconds.
2. Instant allergen answer on every product ("contains gluten: yes/no/unknown") for all 14 EU allergens.
3. Painless product creation when a barcode is unknown (natural portions, minimal required fields).
4. Macro overview your way: focus on one macro or all four (kcal, carbs, protein, fat); count up or down.
5. Flexible meal structure: breakfast → lunch → dinner, unlimited snacks between/after.

## Non-goals for v1.0

See `NON_GOALS.md`. Notably: workouts (v1.1), trust graph (v1.2), planning (v1.3), community/social (v1.4), funding (v1.5), AI photo + coach (v2.0, paid).

## Target users

See `ICP.md`. Primary: the Allergy-Aware Tracker (gluten-free, gym 2–4x/week, NL/EU).

## Key decisions (locked)

| Decision | Choice |
|---|---|
| MVP scope | Food logging + allergen display only |
| Accounts | Required at startup (email + Google/Apple sign-in) |
| Allergens | All 14 EU allergens in data model and UI from v1.0 |
| Seed data | Open Food Facts + Macrio parent/staple seed; community versions on top |
| Community data | Simple in v1.0: product versions + likes + report button |
| Language | Follows phone language (nl/en), switchable in settings |
| Units | Metric (g, ml, kg) + kcal only |
| Platforms | Android (Samsung/Pixel) + iOS via React Native (Expo) |
| Backend | Supabase (Postgres, Auth, Storage) |
| Monetization | GitHub Sponsors donations; core stays free |
| Dev testing | Expo Go on founder's phone |

## Success metrics

See `SUCCESS_METRICS.md`.

## Release plan

See `ROADMAP.md` and `docs/process/VERSIONING.md`. v1.0 is built in one long work session; subsequent minor/major versions are planned from community feedback.
