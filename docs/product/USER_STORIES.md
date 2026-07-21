# User Stories — v1.0

> Format: story + acceptance criteria (AC). All stories are v1.0 unless marked.

## Onboarding

**US-01 — Sign up**
As a new user, I want to create an account with email or Google/Apple so my data is safe and syncs.
- AC: email+password, Google, and Apple sign-in all work; errors are human-readable in nl/en.

**US-02 — Pick my allergens**
As a gluten-free user, I want to select my allergens once so every product warns me automatically.
- AC: all 14 EU allergens selectable (0..n); changeable later in settings; selection immediately affects search results and product pages.

**US-03 — Set goals (optional)**
As a user, I want to optionally set daily kcal and macro targets so I can track against them.
- AC: skippable; editable in settings; without goals the diary just counts up.

## Logging

**US-10 — Scan a barcode**
As a user, I want to scan a product barcode and log it in seconds.
- AC: camera scan → product found → portion pre-selected → confirm adds to chosen meal in ≤ 3 taps.

**US-11 — Create a missing product**
As a user, when a barcode is unknown I want one button to create the product myself.
- AC: "not found" screen has a prominent Create button; required fields only: name, kcal/carbs/protein/fat per 100 g; portion name + gram weight offered with sensible default (e.g. "1 portie – 150 g", never 1 g); photo and allergens optional; new product is immediately loggable and publicly visible.

**US-12 — Search approximately**
As a user searching "appel", I want a generic apple entry first because I don't care about the exact type.
- AC: generic entries rank above branded ones; search works in nl and en.

**US-13 — Recents across meals**
As a user, I want one recents list regardless of which meal I logged something in.
- AC: recents are global, most-recent-first, deduplicated.

**US-14 — Flexible meals**
As a user, I want breakfast/lunch/dinner fixed plus unlimited snacks between and after.
- AC: snack meals can be added between any main meals and after dinner; breakfast is always first; snacks are named/numbered automatically.

**US-15 — Adjust portions naturally**
As a user, I want to log "1 burger" or "150 g" interchangeably.
- AC: portion picker offers product portions and raw grams; conversion is automatic.

## Overview & reports

**US-20 — Macro display my way**
As a user, I want to switch between one-macro focus and all-four overview.
- AC: toggle persists; both views show per-day and per-meal numbers.

**US-21 — Count up or down**
As a user, I want to choose counting up (consumed) or down (remaining).
- AC: user setting; affects all summaries; default is count up.

**US-22 — Day/week reports**
As a user, I want daily and weekly totals to spot patterns.
- AC: day view and week view with kcal + 3 macros; period picker.

## Allergens

**US-30 — Instant allergen answer**
As an allergic user, I want every product to clearly show whether I can eat it.
- AC: product page and search rows show contains / free / unknown per selected allergen; "unknown" is honest, never guessed; a visible disclaimer links to LEGAL notice.

## Community (simple layer)

**US-40 — Product versions & likes**
As a contributor, I want product edits to create versions others can like and browse.
- AC: edit = new version; default view = most-liked version; version history browsable; one like per user per version.

**US-41 — Report bad data**
As a user, I want to report wrong entries.
- AC: report with reason; stored in moderation queue (resolution automated in v1.2).

## Feedback

**US-50 — In-app feedback**
As a user, I want to send feedback with a screenshot so the roadmap reflects real usage.
- AC: form with text + optional screenshot; auto-attaches app version, session duration, days since install.
