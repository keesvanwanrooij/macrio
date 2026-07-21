# Macrio mobile app (React Native / Expo)

Expo SDK 57, TypeScript, expo-router. Talks directly to Supabase (see `../backend/supabase/`).

## Run it on your phone (Expo Go)

1. Complete the backend setup once: `../backend/supabase/README.md` (~10 min).
2. Copy `.env.example` to `.env` and fill in your Supabase URL + anon key.
3. Install and start:

```bash
npm install
npm start
```

4. Install **Expo Go** from the Play Store / App Store, scan the QR code from the
   terminal (phone and PC must be on the same Wi-Fi).

## Structure

```
src/app/            expo-router screens
  (auth)/           welcome, sign-in, sign-up
  (tabs)/           diary (index), reports, settings
  add-food.tsx      scan | search | recents | quick add (modal)
  log-entry.tsx     portion picker / edit diary entry
  product/          product page ([id]) + create/new-version form
  onboarding.tsx    allergens + optional goals
  feedback.tsx      in-app feedback (modal)
src/components/     shared UI (buttons, macro summary, allergen badges)
src/lib/            supabase client, i18n, session context, OFF import, helpers
src/locales/        nl.json, en.json — all UI strings
```

## Conventions

- No hardcoded strings: everything through i18next (`docs/i18n/`).
- Diary entries snapshot macros at log time — history never changes.
- Allergen honesty: missing data renders as "unknown", never "free".
