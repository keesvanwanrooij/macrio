# Getting Macrio running on your phone

Three steps, ~15 minutes total. You only do steps 1–2 once.

## 1. Supabase backend (~10 min)

1. Go to [supabase.com](https://supabase.com) → create account → **New project**
  - Name: `macrio` · Region: **EU (Frankfurt)** · save the DB password.
2. Open **SQL Editor** → paste & run `backend/supabase/migrations/001_init.sql`.
3. Same way, run `backend/supabase/migrations/002_seed.sql`.
4. Same way, run `backend/supabase/migrations/003_profiles_nickname.sql` (username/nickname era + full name; later renamed by 008).
5. Same way, run `backend/supabase/migrations/004_drop_display_name.sql` (removes legacy `display_name` column).
6. Same way, run `backend/supabase/migrations/005_auth_profile_repair.sql` (safe usernames + repair orphan profiles).
7. Same way, run `backend/supabase/migrations/006_profile_body_metrics.sql` (DOB, height, weight, gender, activity for goal calculator).
8. Same way, run `backend/supabase/migrations/007_profile_weight_goal.sql` (lose / maintain / gain intent).
9. Same way, run `backend/supabase/migrations/008_rename_nickname_to_username.sql` (column `nickname` → `username`).
10. Same way, run `backend/supabase/migrations/009_grant_authenticated_table_privs.sql` (fixes "permission denied for table profiles").
11. Same way, run `backend/supabase/migrations/010_set_product_barcode.sql` (add barcode later to products created without one).
12. **Authentication → URL Configuration** (fixes broken confirm-email links):
   - **Site URL:** `http://localhost:3000` (do **not** use your `*.supabase.co` project URL here)
   - **Redirect URLs:** add `http://localhost:3000` (and keep it in `app/.env` as `EXPO_PUBLIC_AUTH_REDIRECT_URL`)
13. **Authentication → Providers → Email** → **Confirm email** may be **OFF** while founder-testing (faster sign-up). Turn it **ON** before public release — see `docs/product/ROADMAP_MINOR.md` (v1.0.2). Set **minimum password length** to **8**.
14. **Project Settings → API** → copy the *Project URL* and the *anon public* key.



## 2. App configuration (~1 min)

1. Copy `app/.env.example` to `app/.env`.
2. Paste your URL and anon key into it.
3. Keep `EXPO_PUBLIC_AUTH_REDIRECT_URL=http://localhost:3000` (must match Supabase URL Configuration above).



## 3. Start & test (~2 min)

See also **Run the app** in [`README.md`](README.md).

From the repo root:

```powershell
cd app
npm install
npm start -- --clear
```

Run `npm install` only the first time (or after dependencies change). Off the same Wi-Fi, use `npm start -- --clear --tunnel`.

**Folder name:** clone or rename the repo folder to **`Macrio`** (matches the app brand; avoids `&` in paths on Windows).

- Install **Expo Go** from the Play Store (Android) or App Store (iPhone). Macrio targets **Expo SDK 54** — your Expo Go app must match (e.g. Play Store **54.x**). If you previously saw “project is incompatible”, pull the latest code and run `npm install` again.
- Scan the QR code shown in the terminal (phone and PC on the same Wi-Fi).
- Macrio opens: **create an account** → check your email for the confirmation link → **sign in** → pick allergens → start logging.



## Troubleshooting


| Problem                           | Fix                                                                                           |
| --------------------------------- | --------------------------------------------------------------------------------------------- |
| "Missing Supabase config" error   | `.env` missing or not filled in — restart `npm start` after editing                           |
| Sign-up succeeds but app stays on welcome | Confirm email is on — open the link in your inbox, then use **Sign in** |
| Sign-in button finishes but nothing happens | Reload with `npm start -- --clear` from `app/`. Prefer **email + password** (not username). Email confirmation is **not** in `profiles` — check **Authentication → Users** → your user → **Confirm email** / Email Confirmed. |
| “permission denied for table profiles” after onboarding | Run `009_grant_authenticated_table_privs.sql` in Supabase SQL Editor, then finish onboarding / save goals again. |
| “Almost there” / profile missing after login | Run `005_auth_profile_repair.sql`, then Retry. Check Table Editor → `profiles` has a row with the same `id` as the auth user and a `username`. |
| Wrong password / username not found | Use your full email address. Username login needs migration `003`/`005`/`008` (`resolve_login_email`). |
| Confirmation email not received | Check spam; wait a few minutes; in Supabase → Authentication → Users, resend or delete user and try again |
| Confirm link shows `{"error":"requested path is invalid"}` | **Site URL** was set to `*.supabase.co` — change it to `http://localhost:3000` (step 1.5). Your email may still be confirmed: try **Sign in**. Otherwise delete the user and sign up again for a fresh email. |
| QR scan does nothing / timeout    | Phone and PC must share the same network; try `npm start -- --tunnel`                         |
| “Project is incompatible with Expo Go” | App SDK must match Expo Go (Macrio uses **SDK 54**). Update Expo Go from the store, run `npm install` in `app/`, then `npm start -- --clear` |
| Barcode scan finds nothing        | Normal for obscure products — the app then checks Open Food Facts, then offers Create product |


