# Getting Macrio running on your phone

Three steps, ~15 minutes total. You only do steps 1–2 once.

## 1. Supabase backend (~10 min)

1. Go to [supabase.com](https://supabase.com) → create account → **New project**
   - Name: `macrio` · Region: **EU (Frankfurt)** · save the DB password.
2. Open **SQL Editor** → paste & run `backend/supabase/migrations/001_init.sql`.
3. Same way, run `backend/supabase/migrations/002_seed.sql`.
4. **Authentication → Sign In / Up → Email** → turn **Confirm email** OFF (smooth testing).
5. **Project Settings → API** → copy the *Project URL* and the *anon public* key.

## 2. App configuration (~1 min)

1. Copy `app/.env.example` to `app/.env`.
2. Paste your URL and anon key into it.

## 3. Start & test (~2 min)

```powershell
cd app
npm install   # first time only
npm start
```

- Install **Expo Go** from the Play Store (Android) or App Store (iPhone).
- Scan the QR code shown in the terminal (phone and PC on the same Wi-Fi).
- Macrio opens: create an account, pick your allergens, start logging.

## Troubleshooting

| Problem | Fix |
|---|---|
| "Missing Supabase config" error | `.env` missing or not filled in — restart `npm start` after editing |
| Sign-up says "confirm your email" | Step 1.4 — turn Confirm email off |
| QR scan does nothing / timeout | Phone and PC must share the same network; try `npm start -- --tunnel` |
| Barcode scan finds nothing | Normal for obscure products — the app then checks Open Food Facts, then offers Create product |
