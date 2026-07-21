# Versioning & Releases

## Scheme

`MAJOR.MINOR.PATCH`

- **Major:** new product areas (v2.0 = community/social).
- **Minor:** new features within existing areas, planned from community feedback (v1.1 workouts+body, v1.2 trust graph+health sync, v1.3 meal planning+questionnaire).
- **Patch:** bug fixes only, shipped as needed.

## Cadence

- v1.0 is built in one long work session.
- After launch: minor releases planned per feedback cycle (see `FEEDBACK_LOOP.md`), no fixed calendar — quality over dates.

## Mechanics

- Git tags `v1.0.0` etc. on `main`; `CHANGELOG.md` updated every release (Keep a Changelog format).
- App version in `app.json` matches the tag; EAS build profiles for preview/production.
- Release steps: `RELEASE_CHECKLIST.md`.
