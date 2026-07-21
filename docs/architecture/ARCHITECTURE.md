# System Architecture — v1.0

## Overview

```
┌─────────────────────────────┐
│  Mobile app (React Native)  │  Expo managed, TypeScript
│  Android (Samsung/Pixel)    │  Testing: Expo Go
│  + iOS (iPhone)             │
└──────────────┬──────────────┘
               │ supabase-js (TLS)
┌──────────────▼──────────────┐
│         Supabase (EU)       │
│  Auth (email/Google/Apple)  │
│  Postgres + RLS             │
│  Storage (photos)           │
│  Edge Functions (delete-    │
│    account)                 │
└──────────────┬──────────────┘
               │ seed import (one-off)
┌──────────────▼──────────────┐
│      Open Food Facts        │  ODbL, NL+EN products
└─────────────────────────────┘
```

## Stack decisions (see `adr/`)

- ADR-001: React Native (Expo) — health integrations, web reuse, AI-assisted dev, contributor pool.
- ADR-002: Supabase — relational trust graph/community data, auth, triggers for future automated moderation.
- ADR-003: Open Food Facts seed — barcodes + allergen tags under open license.

## App structure (planned for the MVP session)

```
app/
├── app/                    # expo-router screens (auth, diary, add-food, product, reports, settings)
├── src/
│   ├── components/         # UI building blocks
│   ├── features/           # diary, products, allergens, feedback (logic + hooks)
│   ├── lib/                # supabase client, i18n setup
│   ├── locales/            # nl.json, en.json
│   └── types/              # generated DB types + domain types
└── app.json / eas.json
```

Key libraries: expo-router, expo-camera (barcode), @supabase/supabase-js, i18next + react-i18next, expo-secure-store, expo-image-picker.

## Cross-cutting

- **i18n:** all strings via i18next; device language default, override in settings (`docs/i18n/`).
- **Connectivity:** v1.0 online-required with friendly offline state; offline-first later (`OFFLINE_SYNC.md`).
- **Types:** Supabase-generated TypeScript types keep DB and app in sync.

## Related docs

`DATA_MODEL.md` · `API.md` · `SECURITY.md` · `TRUST_GRAPH.md` (v1.2) · `OFFLINE_SYNC.md` (later) · `INTEGRATIONS.md` (v1.2)
