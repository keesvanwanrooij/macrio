# Changelog

All notable changes to Macrio. Format: [Keep a Changelog](https://keepachangelog.com/), versioning per `docs/process/VERSIONING.md`.

## [0.4.1] - 2026-07-23

### Added

- Unified goal **% macro editor** (default carbs 50 / protein 20 / fat 30): gram boxes, kcal + % + g/kg hints, % sliders with ring cascade (carbs?protein?fat)
- Two-way editing: change kcal keeps %; change one gram updates kcal and %; move slider keeps kcal
- Save validation: partial goals blocked; all-empty clears goals
- Migration `019_goal_macro_mode.sql` (column unused by UI after unify; kept for now)

### Changed

- Removed Simple / Athlete / Keto mode chips; calculator always seeds 50/20/30
- Reports week goal line + diary/create-product macro label polish
- Agent prompts moved to local `/prompts/` (gitignored); root `Prompts.md` removed
- App version **0.4.1**

## [0.4.0] - 2026-07-23

### Added

- Onboarding **Niets / Nothing** allergen chip (Skip also saves `allergens: []`)
- Soft height/weight validation messages (100-230 cm, 30-250 kg); block <= 0; no age soft message
- Shared **GoalMacroEditor**: kcal + g/kg sliders + gram fields with cascade, 5% balance warn, empty-field fill
- `@react-native-community/slider` dependency

### Changed

- Goal calculator default closed on onboarding + Settings; silent save on Bereken doelen (no popup)
- Plan files renamed from legacy `v1.0.x` to matching `v0.N.0-*` ship names
- App version **0.4.0**

## [0.3.0] - 2026-07-22

### Added

- Settings: edit **username**, change **password** (current-password challenge), change **email** (confirm-to-new-address + `/auth/email-callback`)
- Shared native **date picker** for DOB (onboarding/Settings calculator), diary day jump, and reports day/week jump (max = today)
- Profile **date format** preference (default DD-MM-YYYY; also YYYY-MM-DD, MM-DD-YYYY)
- GDPR **Download my data** (JSON via `export_my_data` + diary CSV; in-app share)
- GDPR **Delete account**: double confirm, immediate auth ban + soft-delete, **30-day** purge via Edge Function `purge-deleted-accounts` + SQL `purge_due_deleted_accounts()`
- Migration `017_settings_identity_gdpr.sql`

### Changed

- Diary / reports: tap date label opens picker (  still step); cannot navigate past today
- App version **0.3.0**

## [0.2.0] - 2026-07-22

### Added

- In-app **forgot password** + **set new password** (nl/en), with deep-link callback (`/auth/callback`)
- Paste-ready branded Supabase email templates (confirm + reset) under `backend/supabase/email-templates/`
- SETUP checklist for Confirm email, redirect URLs (`macrio://**`, `exp://**`), and templates

### Changed

- Supabase client uses PKCE (`flowType: 'pkce'`) for email recovery links
- App version **0.2.0**

## [0.1.0] - 2026-07-22

First pre-public patch under the **0.x** scheme (`docs/process/VERSIONING.md`).

### Added

- **Sentry** crash / error reporting (`@sentry/react-native`): optional `EXPO_PUBLIC_SENTRY_DSN`, PII-safe init, root layout wrap
- Expo + Metro Sentry plugins for future release source-map uploads (`SENTRY_AUTH_TOKEN` at build time)
- Dev-only Settings button to send a smoke-test error
- SETUP notes for founding a Sentry project

### Changed

- App config moved from `app.json` to `app.config.js` (version **0.1.0**)

## [Unreleased] - founder MVP history (was labeled 1.0.0)

Partial work toward later 0.x patches is tracked in `docs/product/ROADMAP_MINOR.md`.

### Added
- Food diary: breakfast/lunch/dinner + snack slots between and after meals, date navigation, pull-to-refresh
- Macro summary: overview (all 4) and focus (one big, tap to cycle) modes; count up or down vs optional goals
- Add food: barcode scan (camera) ? own DB ? live Open Food Facts import ? create-product fallback
- Search with generic-first ranking; global recents across meals; quick add without product
- Product creation: natural portion prefill (never 1 gram), photo upload, tri-state allergen tagging
- Product pages: macros per 100 g and per portion, full EU-14 allergen table (user's allergens pinned), version history with likes, report button, suggest-improvement flow
- Allergen safety: warning banners and badges for the user's selected allergens; honest "unknown" state; disclaimer texts (nl/en)
- Reports: day breakdown per meal; week bar chart with averages
- Onboarding: allergen selection + optional daily goals
- Settings: language (nl/en), count direction, macro display, allergens, goals, sign out, GDPR account deletion
- In-app feedback with optional screenshot + automatic metadata (app version, session time, days since install)
- Auth: email/password via Supabase; profile auto-created on signup
- Backend: full Postgres schema with RLS, like-count triggers, search/create RPCs, storage buckets, seed of ~54 generic Dutch/English foods

### Added (founder testing, before 0.1.0)

- Fractional portion counts when logging
- Add barcode later (type/scan) on product page
- Recents show each user's last-logged version per product
- Product report modal (all reasons + cancel on Android)
- App version in Settings (from Expo config)
- Allergen `may_contain` / kan bevatten (orange)

