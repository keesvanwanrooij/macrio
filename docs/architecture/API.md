# API — v1.0

> No custom REST layer: the app talks to Supabase directly (PostgREST + RLS). This file lists the access patterns the client uses.

## Auth (Supabase Auth)

- Email+password sign-up/sign-in; Google and Apple OAuth.
- Session persisted with `@supabase/supabase-js` in the RN app (SecureStore).

## Reads

| Pattern | Implementation |
|---|---|
| Diary for a date | `diary_entries` where user+date, ordered by meal_position |
| Global recents | distinct latest products from own `diary_entries` (view `user_recents`) |
| Barcode lookup | `products` by barcode → `current_product_versions` view |
| Search | RPC `search_products(query, lang)` — trigram/ILIKE on name_nl/name_en, generic-first ranking |
| Product page | version + portions + allergen fields; versions list ordered by like_count |
| Reports (week) | RPC `weekly_totals(user_id, week_start)` or client aggregate |

## Writes

| Action | Implementation |
|---|---|
| Log food | insert `diary_entries` with macro snapshot computed client-side from chosen version+grams |
| Create product | RPC `create_product(...)` — inserts product + version 1 + portions atomically |
| Edit product | RPC `create_product_version(...)` — new immutable version |
| Like version | insert `version_likes` (trigger bumps like_count) |
| Report | insert `reports` |
| Feedback | insert `feedback` (+ screenshot upload to Storage bucket `feedback`) |
| Settings | update own `profiles` row |
| Delete account | Edge Function `delete-account`: erase personal data, anonymize contributions (GDPR) |

## Storage buckets

- `product-photos` — public read, authenticated write.
- `feedback` — private (owner + maintainers).

## Seed pipeline (not client-facing)

- `backend/supabase/seed/import-off.ts` — Open Food Facts import (see ADR-003).
