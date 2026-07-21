# Macrio — Open-source food & fitness tracker

> Bilingual (Dutch/English), community-governed calorie & macro tracking with allergen safety (gluten-free first) and a full workout planner. One app, use either half or both.

**Status:** documentation complete, MVP (v1.0, food logging) ready to build.

**Funding:** Macrio is free and open source, funded by [GitHub Sponsors](https://github.com/sponsors/keesvanwanrooij) donations. Core features will never be paywalled.

## Why Macrio?

- **Allergen-safe:** every product answers "can I eat this?" for all 14 EU allergens — honestly (`unknown` is never guessed as `free`).
- **Log in seconds:** barcode scan, global recents, natural portions ("1 burger = 150 g"), one-tap product creation.
- **Your way:** count up or down; focus on one macro or see all four; unlimited snacks between meals.
- **Community-owned data:** versioned products, likes, and (soon) a trust graph — no developer dictatorship, no paywall creep.

## Docs

| Start here | |
|---|---|
| Product requirements | [`docs/product/PRD.md`](docs/product/PRD.md) |
| MVP scope | [`docs/product/MVP_SCOPE.md`](docs/product/MVP_SCOPE.md) |
| Roadmap | [`docs/product/ROADMAP.md`](docs/product/ROADMAP.md) |
| Architecture | [`docs/architecture/ARCHITECTURE.md`](docs/architecture/ARCHITECTURE.md) |
| Data model | [`docs/architecture/DATA_MODEL.md`](docs/architecture/DATA_MODEL.md) |

## Repository layout

```
app/                  React Native (Expo) mobile app — Android + iOS
backend/supabase/     Supabase: schema, migrations, edge functions, seed scripts
design/               Branding, UI assets
docs/
  product/            PRD, scope, stories, flows, roadmap, feature specs, research
  design/             Principles, information architecture, wireframes
  architecture/       System design, data model, API, security, ADRs
  process/            Versioning, branching, testing, releases, feedback loop
  community/          Governance
  i18n/               Glossary, translation workflow (nl/en)
.github/              Issue/PR templates, funding
```

## Stack

React Native (Expo, TypeScript) · Supabase (Postgres, Auth, Storage, EU region) · Open Food Facts seed data · i18next

## Contributing

See [`CONTRIBUTING.md`](CONTRIBUTING.md). This project is community-governed by design.

## License

AGPL-3.0 — see [`LICENSE`](LICENSE). Food data: ODbL (seeded in part from [Open Food Facts](https://openfoodfacts.org)).
