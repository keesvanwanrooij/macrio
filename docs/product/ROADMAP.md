# Roadmap

> Major.minor versions planned per community feedback cycle (`docs/process/FEEDBACK_LOOP.md`). Order below is the plan; feedback can reshuffle minors.

**App version:** **1.0.0** (founder testing). Patch numbers below are **planned releases** — see checkboxes in [`ROADMAP_MINOR.md`](ROADMAP_MINOR.md). Bump version only when a patch ships (`docs/process/VERSIONING.md`).

## v1.0 — MVP (one build session) — food logging

Scope locked in `MVP_SCOPE.md`. Triage incoming feedback into [`ROADMAP_MINOR.md`](ROADMAP_MINOR.md) **Inbox**, [`notes.md`](../project-context/notes.md), or other `project-context/` files.

**Progress (shipped in 1.0.0, founder testing):**

- [x] Diary: meals/snacks, date nav, edit/delete entries
- [x] Scan → DB → Open Food Facts → create product
- [x] Search, recents, quick add
- [x] Product versions, likes, reports, suggest edit
- [x] EU-14 allergens (honest unknown), nl/en
- [x] Count up/down, macro focus/overview, day/week reports
- [x] Onboarding (allergens + goals), email auth, profiles
- [x] In-app feedback + Settings
- [x] Supabase schema, RLS, seed data

**Pre-public polish:** patches **v1.0.1 → v1.0.8** in `ROADMAP_MINOR.md`, then public launch.

## v1.0.x — food logging polish (patches)

Ship order and detail: `ROADMAP_MINOR.md`. Working plans: [`plans/`](plans/README.md).

- [ ] **v1.0.1:** Portion units g/ml + default 100 g; fractional counts. [plan](plans/v1.0.1-portion-units.md)
- [ ] **v1.0.2:** Auth emails + forgot password. [plan](plans/v1.0.2-auth-emails.md)
- [ ] **v1.0.3:** Settings identity & dates (username, DOB, date format). [plan](plans/v1.0.3-settings-identity.md)
- [ ] **v1.0.4:** Onboarding/goals UX. [plan](plans/v1.0.4-onboarding-goals.md)
- [ ] **v1.0.5:** Diary meal totals + daily progress. [plan](plans/v1.0.5-diary-progress.md)
- [ ] **v1.0.6:** Named portions S/M/L. [plan](plans/v1.0.6-named-portions.md)
- [ ] **v1.0.7:** Cook state cooked/uncooked/n/a. [plan](plans/v1.0.7-cook-state.md)
- [ ] **v1.0.8:** Parent catalog + Dutch seed (pre-launch). [plan](plans/v1.0.8-parent-catalog.md)
- [ ] **Later (post-launch OK):** Full unit model per 100 g or 100 ml

## v1.1 — workout builder & tracker

- [ ] Unlimited workouts
- [ ] Hevy-style logging (sets, kg, reps, PRs)
- [ ] Pre-filled + custom exercises (community likes)
- [ ] Body metrics menu (weight, fat %, photos)

## v1.2 — trust & connections

- [ ] Weighted trust graph; community report voting
- [ ] Version hygiene (trim/archive low-like old versions)
- [ ] Health sync (Health Connect, HealthKit, Samsung)

## v1.3 — planning & personalization

- [ ] Meal planning
- [ ] Optional onboarding questionnaire
- [ ] Quick-log restaurant % macro sliders
- [ ] Personal add-food tab order
- [ ] Custom report periods; workout heatmap

## v1.4 — community

- [ ] Posts, groups, chat, moderation
- [ ] Profiles (XP, badges, life-wheel)
- [ ] Prices per country (community, optional)

## v2.x — intelligence (paid)

- [ ] AI photo meal logging (only planned paid feature)
