# Macrio backend (Supabase)

## One-time setup (~10 minutes)

1. Create a free account at [supabase.com](https://supabase.com) and create a new project:
   - Name: `macrio`
   - Region: **EU (e.g. Frankfurt)** — required for GDPR
   - Save the database password somewhere safe.
2. In the dashboard, open **SQL Editor** and run, in order:
   - `migrations/001_init.sql` (schema, security, storage buckets)
   - `migrations/002_seed.sql` (generic foods seed)
3. Disable email confirmation (so testing is smooth):
   - **Authentication → Sign In / Up → Email** → turn **Confirm email** OFF.
4. Get your keys: **Project Settings → API**:
   - `Project URL` → `EXPO_PUBLIC_SUPABASE_URL`
   - `anon public` key → `EXPO_PUBLIC_SUPABASE_ANON_KEY`
5. Put both in `app/.env` (copy `app/.env.example`).

## Notes

- Product data additionally flows in live from Open Food Facts: when a scanned
  barcode is unknown in our database, the app fetches it from OFF and imports it
  (ADR-003). The seed only covers generic staples.
- All security is enforced with Postgres Row Level Security — see
  `docs/architecture/SECURITY.md`.
- Account deletion is the `delete_account()` RPC (GDPR).
