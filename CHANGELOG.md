# Changelog

All notable changes to Macrio. Format: [Keep a Changelog](https://keepachangelog.com/), versioning per `docs/process/VERSIONING.md`.

## [Unreleased] — v1.0.0 (MVP, built, in founder testing)

### Added
- Food diary: breakfast/lunch/dinner + snack slots between and after meals, date navigation, pull-to-refresh
- Macro summary: overview (all 4) and focus (one big, tap to cycle) modes; count up or down vs optional goals
- Add food: barcode scan (camera) → own DB → live Open Food Facts import → create-product fallback
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
