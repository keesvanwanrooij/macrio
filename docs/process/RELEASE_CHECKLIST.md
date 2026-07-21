# Release Checklist

## Every release

- [ ] All targeted stories meet Definition of Done
- [ ] Manual test pass on Android (Expo Go / build) — iOS when hardware available
- [ ] Both languages spot-checked (nl/en)
- [ ] `CHANGELOG.md` updated; version bumped in `app.json`
- [ ] Tag `vX.Y.Z` pushed; GitHub release with notes referencing addressed feedback

## Store releases (first store launch adds)

- [ ] Privacy policy live at macrio.nl/privacy
- [ ] Allergen disclaimer + OFF attribution visible in app
- [ ] Account deletion flow works (store requirement)
- [ ] EAS production builds pass; store listings (nl/en) ready
- [ ] Screenshots current

## After release

- [ ] Monitor feedback table + crash reports for 48h
- [ ] Patch release if a blocker emerges
