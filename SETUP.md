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
12. Same way, run `backend/supabase/migrations/011_barcode_normalize_and_edit.sql` (EAN-13 normalize, edit/clear barcode).
13. Same way, run `backend/supabase/migrations/012_barcode_check_digit.sql` (reject invalid check digits / GS1-128-style codes).
14. Same way, run `backend/supabase/migrations/013_product_visibility.sql` (public/private products + RLS).
15. Same way, run `backend/supabase/migrations/014_goal_revisions.sql` (historical daily goals for report charts).
16. Same way, run later migrations through `016_diary_allergens_map.sql` if you have not already (diary allergen map).
17. Same way, run `backend/supabase/migrations/017_settings_identity_gdpr.sql` (date format preference, soft-delete + export RPCs, purge helper).
18. Same way, run `backend/supabase/migrations/018_username_taken_rejects_signup.sql` (reject taken usernames on signup; `is_username_available` RPC).
18b. Same way, run later goal migrations `019`–`021` if needed, then `022_auth_delete_release_identity.sql` (delete frees email/username; safer orphan repair).
19. **Authentication → URL Configuration** (fixes broken confirm-email / reset / email-change links):
   - **Site URL:** `http://localhost:3000` (do **not** use your `*.supabase.co` project URL here)
   - **Redirect URLs:** add all of:
     - `http://localhost:3000` (same as `EXPO_PUBLIC_AUTH_REDIRECT_URL` in `app/.env`)
     - `macrio://**`
     - `exp://**` while testing with Expo Go (password reset uses `Linking.createURL('/auth/callback')`; email change uses `/auth/email-callback`)
   - **Expo Go password reset on a real phone:** Supabase **rejects** redirect URLs with a LAN IP (`exp://192.168.…`). The email then falls back to **Site URL** `http://localhost:3000` (“site not reachable”) and the one-time link can expire if you also open it on a PC. Start the app with **`npx expo start --tunnel`**, reload on the phone, then request a **new** reset. Open the mail **only on the phone**. Check Metro for `[auth] password reset redirectTo:` — it should show an `exp.direct` (or similar) host, not `192.168.…`.
   - **At public launch (`v1.0.0`):** replace founder `localhost` with your real production Site URL and matching Redirect URL(s). Keep `macrio://**`. Drop or keep `exp://**` only if you still test with Expo Go. Also update `EXPO_PUBLIC_AUTH_REDIRECT_URL` in production env. Checklist: [`ROADMAP.md`](docs/product/ROADMAP.md) → v1.0.0 and [`RELEASE_CHECKLIST.md`](docs/process/RELEASE_CHECKLIST.md).
20. **Authentication → Providers → Email** → **Confirm email**:
   - May stay **OFF** for fast founder sign-up.
   - Turn **ON** when verifying **v0.2.0** and leave **ON** before public **1.0.0**. See `docs/product/ROADMAP_MINOR.md`.
   - Set **minimum password length** to **8**.
21. **Authentication → Email Templates:** paste Macrio HTML from `backend/supabase/email-templates/` (see that folder’s README).
22. **Project Settings → API** → copy the *Project URL* and the *anon public* key.
23. **Custom SMTP** is **not** required for founder testing (Supabase’s built-in mail is enough). Before **public v1.0.0**, enable custom SMTP with mail on **macrio.nl** / **macrio.app** (after hosting + mailbox). See [`ROADMAP.md`](docs/product/ROADMAP.md) → v1.0.0.
24. **GDPR purge cron (v0.3.0):** deploy Edge Function `purge-deleted-accounts` and schedule it daily:
    ```bash
    supabase functions deploy purge-deleted-accounts
    # Dashboard → Edge Functions → Schedules, or:
    supabase functions schedule create purge-deleted-accounts --cron "0 3 * * *"
    ```
    Job name: **`purge-deleted-accounts`**. Calls SQL `purge_due_deleted_accounts()` (service role). Soft-deleted accounts (`profiles.deletion_requested_at`) are hard-purged after **30 days**. Details: `backend/supabase/functions/purge-deleted-accounts/README.md`.
25. **App Store / Play account-deletion note:** Users delete via **Settings → Privacy & data → Delete account** (immediate lockout, 30-day purge). Put that path in store listing / console “account deletion” fields when submitting.



## 2. App configuration (~1 min)

1. Copy `app/.env.example` to `app/.env`.
2. Paste your URL and anon key into it.
3. Keep `EXPO_PUBLIC_AUTH_REDIRECT_URL=http://localhost:3000` (must match Supabase URL Configuration above).

### Sentry crash reporting (v0.1.0 SDK; account at public launch)

The SDK is already in the app. **Wait to create the Sentry account / start the trial until around public `v1.0.0` launch** so the trial covers real usage, not quiet founder testing. Checklist: [`ROADMAP.md`](docs/product/ROADMAP.md) → v1.0.0.

When ready:

1. Create a free account at [sentry.io](https://sentry.io) → new **React Native** project (prefer an **EU** region if offered).
2. Copy the project **DSN** into `app/.env` as `EXPO_PUBLIC_SENTRY_DSN=...` (and production/EAS secrets for store builds).
3. Match plugin slugs if needed: set `SENTRY_ORG` and `SENTRY_PROJECT` to your Sentry org/project slugs (defaults in `app.config.js` are `macrio` / `macrio`).
4. Restart Expo (`npm start -- --clear`). In **Settings → About**, use **Send test error to Sentry** (dev builds only) and confirm the event in the Sentry Issues UI.
5. **Source maps** (readable release stacks) need a native/EAS release build plus `SENTRY_AUTH_TOKEN` in the build environment. Do not commit that token.


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
| Sentry smoke button missing / no events | Need `__DEV__` + non-empty `EXPO_PUBLIC_SENTRY_DSN`; restart Expo after editing `.env` |
| Sign-up succeeds but app stays on welcome | Confirm email is on — open the link in your inbox, then use **Sign in** |
| Sign-in button finishes but nothing happens | Reload with `npm start -- --clear` from `app/`. Prefer **email + password** (not username). Email confirmation is **not** in `profiles` — check **Authentication → Users** → your user → **Confirm email** / Email Confirmed. |
| “permission denied for table profiles” after onboarding | Run `009_grant_authenticated_table_privs.sql` in Supabase SQL Editor, then finish onboarding / save goals again. |
| Profile missing / orphan Auth after login | App repairs via `ensure_own_profile` (normal). If email stays taken after a manual `profiles` delete, remove the user under **Authentication → Users**. Run `022_auth_delete_release_identity.sql` so in-app delete frees email/username. |
| Email still “taken” after deleting account | Soft-delete used to keep `auth.users` for 30 days. Run `022_auth_delete_release_identity.sql` (releases email on delete). For orphans already in Auth with no profile: delete those users in the Auth dashboard (or SQL below). |
| Orphan auth users (founder cleanup) | In SQL Editor: `select u.id, u.email from auth.users u left join public.profiles p on p.id = u.id where p.id is null;` then delete those users in **Authentication → Users**, or `delete from auth.users where id = '<uuid>';` |
| Wrong password / username not found | Use your full email address. Username login needs migration `003`/`005`/`008` (`resolve_login_email`). |
| Confirmation email not received | Check spam; wait a few minutes; in Supabase → Authentication → Users, resend or delete user and try again |
| Confirm link shows `{"error":"requested path is invalid"}` | **Site URL** was set to `*.supabase.co` — change it to `http://localhost:3000` (step 1.5). Your email may still be confirmed: try **Sign in**. Otherwise delete the user and sign up again for a fresh email. |
| QR scan does nothing / timeout    | Phone and PC must share the same network; try `npm start -- --tunnel`                         |
| “Project is incompatible with Expo Go” | App SDK must match Expo Go (Macrio uses **SDK 54**). Update Expo Go from the store, run `npm install` in `app/`, then `npm start -- --clear` |
| Barcode scan finds nothing        | Normal for obscure products — the app then checks Open Food Facts, then offers Create product |
| Need edit/clear barcode RPCs      | Run `011_barcode_normalize_and_edit.sql` then `012_barcode_check_digit.sql` in Supabase SQL Editor |
| Settings export / soft-delete / date format fails | Run `017_settings_identity_gdpr.sql` in Supabase SQL Editor; deploy + schedule Edge Function `purge-deleted-accounts` (step 23) |


