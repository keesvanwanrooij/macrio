/*
 * SECTION: Diary entry allergen flags for quick-add
 * WHAT: Optional list of EU allergen keys the user marked as present on a
 *       quick-add (no product) row. Product-linked rows leave this empty and
 *       use product_versions.allergens instead.
 * HOW: text[] default {}; RLS unchanged (own-row policy already covers new col)
 * INPUT: insert/update from Quick add UI
 * OUTPUT: contains_allergens for diary allergen pills / future reports
 */
alter table public.diary_entries
  add column if not exists contains_allergens text[] not null default '{}';

comment on column public.diary_entries.contains_allergens is
  'Quick-add only: allergen keys the user ticked as present. Product rows use product_versions.allergens.';
