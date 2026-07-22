# Release Checklist

## Every release

- [ ] All targeted stories meet Definition of Done
- [ ] Manual test pass on Android (Expo Go / build) — iOS when hardware available
- [ ] Both languages spot-checked (nl/en)
- [ ] `CHANGELOG.md` updated; version bumped in `app/app.config.js`, `app/package.json`, and root `VERSION`
- [ ] Annotated git tag `vX.Y.Z` created on the release commit (required for every completed board version)
- [ ] Tag pushed when founder asks; GitHub release with notes referencing addressed feedback

## Store releases (first store launch adds)

- [ ] Privacy policy live at macrio.nl/privacy
- [ ] Allergen disclaimer + OFF attribution visible in app
- [ ] Account deletion flow works (store requirement)
- [ ] EAS production builds pass; store listings (nl/en) ready
- [ ] Screenshots current
- [ ] **Hosting + landing HTTPS** live (Site URL target for auth)
- [ ] **Custom SMTP** (macrio.nl / macrio.app) wired in Supabase Auth
- [ ] **Auth URL Configuration (production, not founder Expo Go):**
  - [ ] Site URL = production `https://…` (not `localhost:3000`)
  - [ ] Redirect URLs include that HTTPS origin + `macrio://**`; remove localhost / drop `exp://**` unless still debugging
  - [ ] Production `EXPO_PUBLIC_AUTH_REDIRECT_URL` matches Site URL
  - [ ] Confirm email **ON**; branded templates still pasted
  - [ ] Smoke on a **store/preview build**: confirm signup + forgot password → **New password** screen opens (not home/tabs) → save → sign in. Open mail only on the phone
  - [ ] **Forgot-password abuse (launch):** rate limits (IP + account + spray), cooldown soft lock, progressive IP backoff, light send jitter (see `ROADMAP.md` v1.0.0)
  - See `ROADMAP.md` v1.0.0 and `SETUP.md`

## After release

- [ ] Monitor feedback table + crash reports for 48h
- [ ] Watch forgot-password volume / multi-account sprays; escalate to **v1.5** CAPTCHA / honeypot / ops blocks if needed
- [ ] Patch release if a blocker emerges
