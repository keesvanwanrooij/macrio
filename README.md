# Macrio — Open-source food & fitness tracker

> Bilingual (Dutch/English), community-governed calorie & macro tracking with allergen safety (gluten-free first) and a full workout planner. One app, use either half or both.

**Status:** v1.0 MVP built — in founder testing. First-time setup (Supabase + `.env`): [`SETUP.md`](SETUP.md).

**Funding:** Macrio is free and open source, funded by donations. Core features will never be paywalled.

## Run the app (Windows)

After setup ([`SETUP.md`](SETUP.md)), run npm **inside `app/`** (there is no `package.json` in the Macrio root). From the repo root:

```powershell
cd app
```

First time only (or after dependencies change):

```powershell
npm install
```

Same Wi-Fi as your phone:

```powershell
npm start -- --clear
```

Off the same Wi-Fi (tunnel; slower, needs Ngrok):

```powershell
npm start -- --clear --tunnel
```

Then open **Expo Go** (SDK **54**) on your phone and scan the QR code.

If you see `ENOENT ... package.json`, you are still in the Macrio root - run `cd app` first.

### Tips

- Prefer `npm start -- --clear` for daily testing. Tunnel is only needed off-network.
- If the QR code does nothing: same Wi-Fi, or try tunnel; firewall may block LAN.
- `localhost:8081` is Metro (the app). `localhost:3000` in Supabase is only for auth email redirects - they are unrelated.
- Full backend setup and troubleshooting: [`SETUP.md`](SETUP.md).

## ❤️ Support Macrio

Macrio is built and maintained in personal time, with real out-of-pocket costs: AI-assisted coding tools, domain registration (macrio.nl / macrio.app), backend hosting, and app store developer fees — plus many hours of development.

If Macrio helps you, please consider supporting the project:

**[→ Donate via GitHub Sponsors](https://github.com/sponsors/keesvanwanrooij)**

Every donation goes directly into keeping Macrio free, open, and ad-free for everyone.

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
| Patch board | [`docs/product/ROADMAP_MINOR.md`](docs/product/ROADMAP_MINOR.md) |
| Working plans | [`docs/product/plans/`](docs/product/plans/README.md) |
| Founder notes | [`project-context/notes.md`](project-context/notes.md) |
| Product naming | [`docs/product/NAMING.md`](docs/product/NAMING.md) |
| App version | [`VERSION`](VERSION) (mirrors `app/app.json`; bump on patch release only) |
| Architecture | [`docs/architecture/ARCHITECTURE.md`](docs/architecture/ARCHITECTURE.md) |
| Data model | [`docs/architecture/DATA_MODEL.md`](docs/architecture/DATA_MODEL.md) |

## Repository layout

```
app/                  React Native (Expo) mobile app — Android + iOS
backend/supabase/     Supabase: schema, migrations, edge functions, seed scripts
design/               Branding, UI assets
docs/
  product/            PRD, scope, stories, flows, roadmap, feature specs, research
    plans/            Working plan md files per patch/feature (see plans/README.md)
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
