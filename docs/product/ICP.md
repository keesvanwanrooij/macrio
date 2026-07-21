# Ideal Customer Profile (ICP)

> Status: v0.1 — draft for naming & positioning. Living document.

## Primary persona: "The Allergy-Aware Tracker"

- **Who:** Adults (20–45) in NL/EU and English-speaking markets who must eat gluten-free (coeliac disease, gluten sensitivity) or manage other food allergies/intolerances, and who also count calories and macros.
- **Situation:** Sedentary job, trains at the gym 2–4x per week. Standard "activity level" questionnaires don't fit their reality.
- **Current tooling:** Juggles 2–3 apps — one for calories (FatSecret/MyFitnessPal/Eetmeter), one for workouts (Strong/Hevy), and label-reading or an unreliable gluten-scanner app for allergy safety.
- **Frustrations (validated by market research, see MARKET_RESEARCH.md):**
  - Paywall creep: barcode scanning and core features moved behind subscriptions.
  - Database rot: duplicate/wrong entries with no quality signal to pick the right one.
  - Gluten-scanner apps give false positives/negatives with zero verification or accountability.
  - No app combines food logging + allergen safety + workout tracking.
  - Product creation is painful (1-gram default portions, too many required fields).
- **Willingness to pay:** Low for basics (expects free, open); potentially paid for AI photo logging later.

## Secondary personas

1. **The Lifter-Logger** — primarily wants an unlimited free workout builder (Strong caps at 3 workouts) with body metrics, PRs and progress photos; food logging is a bonus.
2. **The Allergy Parent/Partner** — shops and cooks for someone with coeliac/allergies; needs a trustworthy "can we eat this?" scan answer in Dutch or English.
3. **The Community Contributor** — enjoys curating data: adds products, verifies macros, pins tutorial videos, earns trust/XP/badges. Powers the self-governing database.

## Geography & language

- Launch: Netherlands (Dutch + English UI, NEVO + Open Food Facts seed data).
- Expansion: EU / English-speaking markets; the allergen problem is universal.

## Devices

- Android (Samsung, Pixel) and iOS (iPhone). One React Native (Expo) codebase.
- Health platform sync (Google Health Connect, Samsung Health, Apple Health) expected.

## What the ICP is NOT

- Not medical patients needing clinically certified advice (we are a guide, not a medical device — this must be explicit in-app).
- Not users wanting a coached diet program (Noom-style); we are a tool, not a coach.
