# Data Model — v1.0

> Postgres (Supabase). Naming: snake_case, plural tables. All tables have `id uuid pk`, `created_at`, `updated_at`.

## ERD (v1.0)

```
profiles ──< diary_entries >── product_versions >── products
profiles ──< products (created_by)
profiles ──< version_likes >── product_versions
profiles ──< reports >── product_versions
profiles ──< feedback
products ──< product_versions ──< portions
product_versions ── allergen fields (EU-14)
```

## Tables

### profiles (extends Supabase auth.users)
| column | type | notes |
|---|---|---|
| id | uuid | = auth.users.id |
| username | text | unique (case-insensitive); public; no spaces |
| full_name | text | private, optional; set in Settings |
| language | text | 'nl' \| 'en', default from device |
| count_direction | text | 'up' (default) \| 'down' |
| macro_display | text | 'overview' (default) \| 'focus' |
| goal_kcal / goal_carbs / goal_protein / goal_fat | numeric null | optional targets |
| date_of_birth | date null | private; age derived in app for goal calculator |
| height_cm | numeric null | private; body height (lengte) |
| weight_kg | numeric null | private; used for goal / macro heuristics |
| gender | text null | `male` \| `female` \| `other` |
| activity_level | text null | `sedentary` \| `light` \| `moderate` \| `active` \| `very_active` |
| weight_goal | text null | `lose` \| `maintain` \| `gain` (muscle) |
| allergens | text[] | subset of EU-14 keys |
| date_format | text | `'DD-MM-YYYY'` (default) \| `'YYYY-MM-DD'` \| `'MM-DD-YYYY'` — display only; storage stays ISO |
| deletion_requested_at | timestamptz null | soft-delete mark; auth user banned immediately; purge after 30 days |

Email addresses are unique per account via **Supabase Auth** (`auth.users.email`).

**GDPR (v0.3.0 + 022):** `delete_account()` soft-deletes (sets `deletion_requested_at`, bans auth user), **and immediately frees email + username** (scrambles `auth.users` / identities so re-register works). Edge cron `purge-deleted-accounts` calls `purge_due_deleted_accounts()` after 30 days (hard-deletes `auth.users`; personal rows cascade; `products.created_by` / `product_versions.edited_by` become null). `export_my_data()` returns JSON for in-app download (profile, diary, goal_revisions, feedback).

### goal_revisions (historical goals for reports)
| column | type | notes |
|---|---|---|
| user_id | uuid fk | |
| effective_date | date | unique per user; goals apply from this date until next revision |
| goal_kcal / goal_carbs / goal_protein / goal_fat | numeric null | snapshot of targets on that date |

`profiles.goal_*` remain the live editable goals. Reports resolve the latest revision with `effective_date <= day`. Upsert via RPC `upsert_goal_revision_for_today` when Settings/onboarding saves goals.

### products
| column | type | notes |
|---|---|---|
| barcode | text unique null | EAN-8/13/UPC; null for generic foods |
| source | text | 'openfoodfacts' \| 'community' |
| created_by | uuid null | profile; null for seeds |
| is_generic | boolean | boosts search ranking |

### product_versions (immutable)
| column | type | notes |
|---|---|---|
| product_id | uuid fk | |
| version_number | int | per product |
| name_nl / name_en | text | at least one required |
| brand | text null | |
| photo_url | text null | Supabase Storage |
| kcal_100g / carbs_100g / protein_100g / fat_100g | numeric | required |
| allergens | jsonb | EU-14 keys → `contains` \| `may_contain` \| `free` \| `unknown` |
| portions | jsonb | `[{ "name": "1 glas", "grams": 250, "unit": "ml" }]` — v1.0: `unit` omitted (defaults to g). **v1.0.1:** add `unit: 'g' \| 'ml'`. Future: per-100ml nutrition for liquids (`ROADMAP.md`). |
| edited_by | uuid null | |
| like_count | int | denormalized via trigger |

Default display version = max(like_count), tie → newest. (View: `current_product_versions`.)

### portions (legacy doc — stored in `product_versions.portions` JSONB)

| field | type | notes |
|---|---|---|
| name | text | e.g. "1 burger", "1 glas" |
| grams | number | amount (mass); for ml portions, v1.0.1 uses same field as ml count (1 ml ≈ 1 g for water-like liquids) |
| unit | `'g' \| 'ml'` | **planned v1.0.1** — display only until per-100ml nutrition ships |

### diary_entries
| column | type | notes |
|---|---|---|
| user_id | uuid fk | |
| date | date | diary day |
| meal_type | text | 'breakfast' \| 'lunch' \| 'dinner' \| 'snack' |
| meal_position | int | orders snacks between mains |
| product_version_id | uuid fk null | null for quick-add |
| grams | numeric | |
| kcal / carbs / protein / fat | numeric | **snapshot at log time** (history never changes) |
| allergens | jsonb | quick-add only: `{ gluten: "contains" }` etc.; `{}` for product rows |
| logged_at | timestamptz | feeds global recents |

Recents = latest distinct products from user's diary_entries.

### version_likes
| user_id + product_version_id | unique pair | trigger maintains like_count |

### reports
| reporter_id, product_version_id, reason ('wrong_macros' \| 'wrong_allergens' \| 'spam' \| 'duplicate' \| 'other'), note, status ('open' default) |
v1.0: queue only. v1.2: community voting resolves.

### feedback
| user_id, message, screenshot_url null, app_version, session_seconds, days_since_install |

## Row Level Security (summary — details in SECURITY.md)

- profiles / diary_entries / feedback: owner-only read+write.
- products / product_versions / portions: public read; authenticated insert; versions immutable (no update/delete).
- version_likes / reports: owner insert; public read of aggregates.

## v1.1+ (reserved, not built)

workouts, exercises, workout_logs, body_metrics, progress_photos → see ROADMAP. Trust-graph tables → `TRUST_GRAPH.md`.
