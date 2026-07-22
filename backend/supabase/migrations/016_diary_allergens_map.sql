/*
 * SECTION: Diary quick-add allergen state map
 * WHAT: Replaces contains_allergens[] with allergens jsonb (same shape as
 *       product_versions.allergens). Keys are EU allergen ids; values are
 *       'contains' | 'free'. Omitted key = unknown (default grey in UI).
 * HOW: 1) add allergens jsonb 2) migrate any existing contains_allergens rows
 *      3) drop contains_allergens
 * INPUT: Quick add UI cycles unknown → contains → free → unknown
 * OUTPUT: diary_entries.allergens for red diary pills (contains only) + future reports
 */
alter table public.diary_entries
  add column if not exists allergens jsonb not null default '{}'::jsonb;

comment on column public.diary_entries.allergens is
  'Quick-add only: map of allergen key → contains|free. Product rows use product_versions.allergens; leave {}. Unknown = key omitted.';

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'diary_entries'
      and column_name = 'contains_allergens'
  ) then
    -- Convert old text[] of contains keys into jsonb map
    update public.diary_entries e
    set allergens = coalesce(
      (
        select jsonb_object_agg(key, to_jsonb('contains'::text))
        from unnest(e.contains_allergens) as key
      ),
      '{}'::jsonb
    )
    where coalesce(cardinality(e.contains_allergens), 0) > 0
      and e.allergens = '{}'::jsonb;

    alter table public.diary_entries drop column contains_allergens;
  end if;
end $$;
