# Security — v1.0

## Authentication

- Supabase Auth: email+password (min 8 chars), Google OAuth, Apple Sign-In (required by Apple when offering Google).
- Tokens stored in Expo SecureStore; auto-refresh via supabase-js.

## Authorization (Row Level Security)

RLS enabled on every table. Policy matrix:

| Table | select | insert | update | delete |
|---|---|---|---|---|
| profiles | own | own (on signup) | own | via delete-account fn |
| diary_entries | own | own | own | own |
| products | public | authenticated | never (versions instead) | never (v1.2 voting) |
| product_versions | public | authenticated (via RPC) | never (immutable) | never |
| portions | public | via RPC | never | never |
| version_likes | public count | own, unique | never | own (unlike) |
| reports | own + maintainers | own | never | never |
| feedback | own + maintainers | own | never | never |

## Data protection

- TLS everywhere; Supabase encryption at rest; EU region project (GDPR).
- Food logs are sensitive-adjacent: no third-party analytics, no trackers, no ads in v1.0.
- Screenshots (feedback) live in a private bucket.
- Account deletion (Edge Function): hard-delete profile, diary, likes, reports, feedback; anonymize created product versions (set created_by/edited_by null) so community data survives.

## Client hygiene

- Only the anon key ships in the app; RLS is the real boundary — never rely on client checks.
- Secrets (`service_role`, OAuth secrets) live in Supabase config / CI secrets, never in the repo (`.env` is gitignored, `.env.example` documents keys).
- Input validation server-side in RPCs (macros ≥ 0, grams > 0, allergen enum).

## Abuse surface (v1.0 accepted risks)

- Spam product creation → rate limit RPC (per-user per-hour) + report queue; real moderation arrives with v1.2 voting.
- Like manipulation → one like per user per version enforced by unique constraint; weighting fixed properly by trust graph (v1.2).

## Vulnerability reporting

See root `SECURITY.md` (GitHub security advisories).
