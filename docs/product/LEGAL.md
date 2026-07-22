# Legal & Compliance Notes

> Status: founder-written outline. Have a lawyer review before public store launch.

## Allergen disclaimer (must ship in v1.0)

Macrio shows community- and Open-Food-Facts-sourced allergen data. It can be wrong or outdated.

- In-app disclaimer (shown at allergen selection and on every product page footer):
  - EN: "Allergen information is community-provided and may be incorrect. Always check the physical label. Macrio is not medical advice."
  - NL: "Allergeneninformatie komt van de community en kan onjuist zijn. Controleer altijd het etiket. Macrio is geen medisch advies."
- Never display "free from X" when data is absent — show "unknown" instead.
- Macrio is not a medical device and must avoid claims that would classify it as one (EU MDR).

## GDPR

- Lawful basis: contract (account + logging service). No ads, no data selling, no third-party analytics in v1.0.
- Data stored: account (email, name), settings, food logs, created products, feedback (incl. optional screenshots, session metadata).
- Rights:
  - **Download my data** in Settings (JSON of profile, diary, goals/body metrics on profile, feedback + diary CSV). In-app share/save; not email-only.
  - **Delete account** in Settings: double confirm → immediate sign-in lockout (soft-delete) → **30-day grace** → purge auth user + personal rows. Created products/versions are **anonymized** (`created_by` / `edited_by` set null), not deleted — community data survives contributors.
- Food/health logs are sensitive-adjacent: minimize collection, encrypt in transit (TLS) and at rest (Supabase default).
- Privacy policy required for app stores — draft before store submission (template TBD).
- Data processor: Supabase (EU region hosting required).

## Licenses

- Code: AGPL-3.0.
- Seed data: Open Food Facts — Open Database License (ODbL). Attribution required in-app ("Powered in part by Open Food Facts"); share-alike applies to database redistribution.
- Community-created product data: contributors agree (in ToS) to release under ODbL-compatible terms so the database stays open.

## App stores

- Apple/Google health-adjacent app rules: no medical claims, disclaimer visible.
- Account deletion must be available in-app (both stores mandate this).
- **Store listing guideline:** describe that users delete their account in **Settings → Privacy & data → Delete account**, with immediate lockout and personal-data purge after 30 days; community food data they contributed may remain without personal identity. Keep App Store / Play Console account-deletion URL or in-app path notes aligned with that flow (see also `SETUP.md`).
