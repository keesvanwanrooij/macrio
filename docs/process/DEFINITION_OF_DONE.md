# Definition of Done

## Per user story

- Acceptance criteria in `USER_STORIES.md` pass on a real device (Expo Go).
- Works in both Dutch and English (no hardcoded strings).
- No TypeScript errors; lints clean.
- RLS verified for any new table/query (cannot read/write another user's data).
- Errors handled with human-readable messages (both languages).

## Per release (v1.0 headline)

The founder can, on his own phone via Expo Go:

1. Sign up with email, pick gluten as allergen, set a kcal goal.
2. Log a full real day: scan a known product, search a generic one, use recents, add a snack between lunch and dinner.
3. Scan an unknown barcode → create the product with "1 portie – 150 g" → it's logged and publicly visible.
4. See gluten warnings on a product that contains gluten, and "unknown" honestly displayed.
5. Toggle focus/overview macro display and count up/down; view the week report.
6. Send feedback with a screenshot.
7. Delete the account and verify data is gone.

Plus: `CHANGELOG.md` updated, tag pushed, seed data imported, disclaimer texts present.
