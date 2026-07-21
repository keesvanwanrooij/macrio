# Minor & Patch Planning — current cycle

> Planning board for improvements within the current minor version (e.g. v1.0 → v1.0.1, v1.0.2 …), fed by founder notes (`project-context/`) and community feedback (in-app + GitHub issues). Big features stay in `ROADMAP.md`; this file is for the small, fast iterations between them.

## How to use this file

1. Collect raw notes and feedback below under **Inbox**.
2. Each planning pass: triage Inbox items → assign to a patch release or reject (with reason).
3. Ship, move the block to **Released**, update `CHANGELOG.md`.

**Ordering:** Patches under **Planned** are listed in **ship order** (next patch first). Reorder freely when priorities change — no need to ask. Keep version numbers sequential; rename headings if you insert or merge patches.

## Inbox (untriaged)

_—_

## Planned

_Ship order: v1.0.1 → v1.0.2 → …_

### v1.0.1 — portion units (g / ml)

**Found during:** Supabase seed review (founder testing setup).

**Problem:** All products and portions use grams only. Liquids (melk, cola, sap, bier, wijn) should show **ml** (e.g. "1 glas – 250 ml"), not "250 g". Nutrition labels for drinks are per 100 ml, not 100 g.

**Quick fix (this patch):**
- Add `unit: 'g' | 'ml'` on portion objects in JSONB (no SQL migration — `portions` is already flexible).
- Update seed data (`002_seed.sql`) for liquid staples.
- UI: portion picker, product page, and create-product show ml where `unit === 'ml'`.
- Macro math: keep per-100g internally for now; for water-like liquids 1 ml ≈ 1 g (acceptable for v1.0.1).

**Affected seed items:** halfvolle/volle melk, havermelk, cola, sinaasappelsap, bier, rode wijn.

### v1.0.2 — email confirmation & branded auth emails

**Found during:** founder auth testing (confirm email turned off in Supabase for faster iteration).

**Problem:** Sign-up works without email verification today. Supabase sends the default confirm-email template (generic Supabase branding), which does not match Macrio.

**Before public release:**
- Turn **Confirm email** back **ON** in Supabase (**Authentication → Providers → Email**). Keep minimum password length at 8.
- Ensure redirect URLs stay aligned with `EXPO_PUBLIC_AUTH_REDIRECT_URL` / deep links when we ship real app links (not only `localhost` for dev).

**Branded confirm email (replace Supabase default):**
- Customize Supabase **Authentication → Email Templates** (confirm signup) with Macrio copy, logo, and colors — nl/en where the dashboard allows, or one neutral template first.
- Longer term: custom SMTP or Auth Hook + Edge Function if we need full bilingual control, transactional provider (e.g. Resend), and consistent tone with in-app i18n.

**App:** sign-up flow already handles “check your email” when session is null after `signUp`; verify copy in `en.json` / `nl.json` after template changes.

## Released

_—_

## Rejected / deferred

| Item | Reason |
|---|---|
| _—_ | |
