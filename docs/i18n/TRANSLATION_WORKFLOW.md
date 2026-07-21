# Translation Workflow (nl / en)

## Setup

- i18next + react-i18next; resources in `app/src/locales/nl.json` and `en.json`.
- Default language = device language (nl/en); fallback = en; user override in settings (stored in profile).
- No hardcoded UI strings — enforced in code review / Definition of Done.

## Rules

- Keys are English, dot-namespaced by screen: `diary.addFood`, `product.allergens.contains`.
- Terms follow `GLOSSARY.md`; both languages ship complete in every release.
- Product data (names) is bilingual in the database (`name_nl` / `name_en`), separate from UI strings; show the user's language, fall back to the other.

## Contributing translations

Community PRs edit the JSON files; new languages = new JSON + glossary section (post-v1.0).
