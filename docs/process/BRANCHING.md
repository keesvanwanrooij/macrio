# Branching & Commits

## Branches

- `main` — always releasable; protected once contributors arrive.
- `feat/<name>`, `fix/<name>`, `docs/<name>` — short-lived branches, merged via PR.
- Solo-founder exception: during the v1.0 build session, committing directly to `main` is fine; branch discipline starts when the repo has contributors.

## Commits

Conventional Commits: `feat:`, `fix:`, `docs:`, `chore:`, `refactor:`, `test:`.
Example: `feat(diary): add snack meals between mains`.

## Releases

Tag on `main` (`v1.0.0`), changelog entry, GitHub release with notes. See `VERSIONING.md` and `RELEASE_CHECKLIST.md`.
