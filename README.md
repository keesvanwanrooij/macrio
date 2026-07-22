# Macrio

<p align="center">
  <img src="app/assets/images/icon.png" alt="Macrio app icon" width="96" height="96" />
</p>

<p align="center">
  <strong>The open-source food tracker where the community governs the data:</strong><br />
  log macros, scan for EU allergens honestly, stay free.
</p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-AGPL--3.0-blue.svg" alt="AGPL-3.0" /></a>
  <a href="app/package.json"><img src="https://img.shields.io/badge/Expo-54-000020?logo=expo" alt="Expo 54" /></a>
  <a href="https://supabase.com"><img src="https://img.shields.io/badge/Supabase-EU-3FCF8E?logo=supabase&logoColor=white" alt="Supabase EU" /></a>
  <img src="https://img.shields.io/badge/i18n-nl%20%7C%20en-0F172A" alt="Dutch and English" />
  <a href="https://github.com/sponsors/keesvanwanrooij"><img src="https://img.shields.io/badge/sponsor-GitHub%20Sponsors-ea4aaa?logo=githubsponsors&logoColor=white" alt="GitHub Sponsors" /></a>
</p>

**NL:** Open-source voedingstracker (nl/en) met eerlijke EU-allergenen. De community **bestuurt** de productdata; die leeft in de Macrio-database.

**Status:** Pre-public **0.2.0** (founder testing on Expo Go). Not on the App Store / Play Store yet. See [`VERSION`](VERSION) and [`SETUP.md`](SETUP.md).

**Funding:** Free and open source. Core features will never be paywalled. Optional support via [GitHub Sponsors](https://github.com/sponsors/keesvanwanrooij).

---

## The problem

People who track calories/macros **and** manage food allergies (gluten-free first) have no single good app. Trackers paywall scanning and let databases rot. Allergen scanners ship unverified crowd data. Nobody combines food logging with honest allergen answers without locking the basics.

## Why Macrio?

- **Allergen-safe by design.** Every product shows EU-14 status. Missing data is `unknown`, never faked as `free`. Always check the physical label. See [`docs/product/LEGAL.md`](docs/product/LEGAL.md).
- **Log in seconds.** Barcode scan, global recents, natural portions ("1 burger = 150 g"), create a product when the DB has nothing.
- **Your way.** Count up or down; focus one macro or see all four; meals plus unlimited snacks.
- **Community-governed catalog.** Product data lives in Macrio’s database (hosted backend). The community improves it through versions, likes, and reports - not a closed corporate DB you cannot challenge. See [`docs/community/GOVERNANCE.md`](docs/community/GOVERNANCE.md).
- **Free and open (AGPL-3.0).** No ads, no paywall creep on core logging. Seeded in part from [Open Food Facts](https://openfoodfacts.org) (ODbL).

### What’s in the app

- Diary with breakfast / lunch / dinner and unlimited snacks
- Scan, search, recents, portions, day and week macro reports
- EU-14 allergen display with honest `contains` / `free` / `unknown` (and may-contain where used)
- Community product versions, likes, and report queue
- Dutch and English UI

More detail: [`docs/product/MVP_SCOPE.md`](docs/product/MVP_SCOPE.md).

### Positioning (short)

| Others often… | Macrio… |
|---|---|
| Paywall scan / starve the free tier | Keeps core logging free |
| Treat missing allergen data as safe | Shows `unknown` honestly |
| Fragment recents per meal | Global recents across meals |
| Closed commercial food DB | Community-governed catalog in an open-source app |

## Screenshots

Product screenshots (diary, allergen warning, scan) will live under `docs/assets/` once captured from Expo Go. Until then, the app icon above is the brand mark.

```
docs/assets/
  diary.png
  allergens.png
  scan.png
```

## Allergen disclaimer

Allergen information is community-provided and Open Food Facts-sourced. It can be wrong or outdated. **Always check the physical label.** Macrio is not medical advice.

EN/NL copy and compliance notes: [`docs/product/LEGAL.md`](docs/product/LEGAL.md).

## Data & licenses

- **Code:** [AGPL-3.0](LICENSE)
- **Product database:** hosted by the Macrio project (Supabase EU). Community members contribute and govern catalog quality; they do not “own” the server or the dataset as a separate legal entity.
- **Seed / food DB:** Open Food Facts under [ODbL](https://opendatacommons.org/licenses/odbl/). Attribution required; share-alike applies when redistributing the database.
- **Community product edits:** contributors release data on ODbL-compatible terms so redistributions of the catalog can stay open.

## Support Macrio

Macrio is built in personal time, with real costs (tools, domains macrio.nl / macrio.app, hosting, store fees).

**[Donate via GitHub Sponsors](https://github.com/sponsors/keesvanwanrooij)**

Donations keep the app free, open, and ad-free. No dark-pattern upsells in the diary.

## How to help

### Without coding

- **Improve food data in the app:** create products, fill allergens/portions, like good versions, report bad ones.
- **Translations:** Dutch/English strings in `app/src/locales/` - see [`docs/i18n/GLOSSARY.md`](docs/i18n/GLOSSARY.md).
- **Feedback:** in-app feedback or GitHub issues (reliability and user-facing improvements welcome).
- **Sponsor** if the project is useful to you.

### With coding

We especially care about **security**. If you find a vulnerability (auth, RLS, data exposure, injection, unsafe deep links, secret leakage, etc.):

1. Prefer a **private** report: [GitHub Security Advisories](https://github.com/keesvanwanrooij/macrio/security/advisories/new) (or open a private security advisory on this repo).
2. Do **not** open a public issue with exploit details.
3. Include steps to reproduce, impact, and (if you have one) a suggested fix.

Also welcome via issues or PRs (see [`CONTRIBUTING.md`](CONTRIBUTING.md)):

- **Reliability:** crashes, data integrity, offline/edge cases, test gaps
- **User features:** concrete UX improvements to what the app already does (clear problem + proposed change)

Please read [`docs/architecture/SECURITY.md`](docs/architecture/SECURITY.md) and keep RLS / allergen honesty intact.

## Docs

| | |
|---|---|
| **Product** | [PRD](docs/product/PRD.md) · [MVP scope](docs/product/MVP_SCOPE.md) · [USP](docs/product/USP.md) · [Legal](docs/product/LEGAL.md) · [Naming](docs/product/NAMING.md) |
| **Features** | [Food logging](docs/product/features/food-logging.md) · [Allergens](docs/product/features/allergen-filter.md) · [Products & community](docs/product/features/products-and-community.md) |
| **Build** | [Architecture](docs/architecture/ARCHITECTURE.md) · [Data model](docs/architecture/DATA_MODEL.md) · [Security](docs/architecture/SECURITY.md) · [API](docs/architecture/API.md) |
| **Process** | [Versioning](docs/process/VERSIONING.md) · [Branching](docs/process/BRANCHING.md) · [Definition of Done](docs/process/DEFINITION_OF_DONE.md) · [Setup](SETUP.md) · [Contributing](CONTRIBUTING.md) |
| **Community / i18n** | [Governance](docs/community/GOVERNANCE.md) · [Glossary](docs/i18n/GLOSSARY.md) |

App version file: [`VERSION`](VERSION).

## Repository layout

```
app/                  React Native (Expo) mobile app - Android + iOS
backend/supabase/     Schema, migrations, seed, email templates
design/               Branding, UI assets
docs/
  product/            PRD, scope, features, legal, research
  architecture/       System design, data model, security, ADRs
  process/            Versioning, branching, testing, releases
  community/          Governance
  i18n/               Glossary, translation workflow (nl/en)
  assets/             README screenshots (add when ready)
.github/              Issue/PR templates, funding
```

## Stack

React Native (Expo, TypeScript) · Supabase (Postgres, Auth, Storage, EU region) · Open Food Facts seed · i18next

Dev setup and troubleshooting (including auth email / tunnel notes): [`SETUP.md`](SETUP.md).

## License

[AGPL-3.0](LICENSE). Food data: ODbL (seeded in part from [Open Food Facts](https://openfoodfacts.org)).
