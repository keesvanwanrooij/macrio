# Testing Strategy

## v1.0 (pragmatic)

- **Manual test matrix:** the Definition of Done release script, executed on the founder's phone via Expo Go, in Dutch and English.
- **Unit tests** (Jest) only for pure logic that silently corrupts data if wrong: portion→macro math, snapshot calculation, meal ordering, allergen badge rules.
- **Database tests:** RLS policies verified with Supabase test users (can't touch others' data).

## Growth path (v1.1+)

- Component tests (React Native Testing Library) for the diary and add-food flows.
- CI on GitHub Actions: typecheck + lint + unit tests on every PR (workflow added when the app scaffold lands).
- E2E (Maestro) once flows stabilize.
