-- Macrio v1.0 — initial schema
-- Run this in the Supabase SQL editor (or via supabase db push).

-- ============================================================
-- PROFILES
-- ============================================================
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  language text not null default 'nl' check (language in ('nl','en')),
  count_direction text not null default 'up' check (count_direction in ('up','down')),
  macro_display text not null default 'overview' check (macro_display in ('overview','focus')),
  goal_kcal numeric check (goal_kcal is null or goal_kcal > 0),
  goal_carbs numeric check (goal_carbs is null or goal_carbs >= 0),
  goal_protein numeric check (goal_protein is null or goal_protein >= 0),
  goal_fat numeric check (goal_fat is null or goal_fat >= 0),
  allergens text[] not null default '{}',
  onboarded boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles own read" on public.profiles
  for select to authenticated using (id = auth.uid());
create policy "profiles own update" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- Auto-create profile on signup
create function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- PRODUCTS & VERSIONS
-- ============================================================
create table public.products (
  id uuid primary key default gen_random_uuid(),
  barcode text unique,
  source text not null default 'community' check (source in ('openfoodfacts','community','seed')),
  is_generic boolean not null default false,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

-- allergens jsonb: {"gluten":"contains","milk":"free"} — missing key = unknown
-- portions jsonb:  [{"name":"1 snee","grams":35}]
create table public.product_versions (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  version_number int not null default 1,
  name_nl text,
  name_en text,
  brand text,
  photo_url text,
  kcal_100g numeric not null check (kcal_100g >= 0),
  carbs_100g numeric not null check (carbs_100g >= 0),
  protein_100g numeric not null check (protein_100g >= 0),
  fat_100g numeric not null check (fat_100g >= 0),
  allergens jsonb not null default '{}'::jsonb,
  portions jsonb not null default '[]'::jsonb,
  edited_by uuid references public.profiles(id) on delete set null,
  like_count int not null default 0,
  created_at timestamptz not null default now(),
  unique (product_id, version_number),
  check (name_nl is not null or name_en is not null)
);

create index product_versions_product_idx on public.product_versions (product_id);
create index product_versions_name_nl_idx on public.product_versions (lower(name_nl));
create index product_versions_name_en_idx on public.product_versions (lower(name_en));

alter table public.products enable row level security;
alter table public.product_versions enable row level security;

create policy "products public read" on public.products
  for select to authenticated using (true);
create policy "products authenticated insert" on public.products
  for insert to authenticated with check (created_by = auth.uid() or created_by is null);

create policy "versions public read" on public.product_versions
  for select to authenticated using (true);
create policy "versions authenticated insert" on public.product_versions
  for insert to authenticated with check (edited_by = auth.uid() or edited_by is null);
-- versions are immutable: no update/delete policies.

-- Current (default) version per product = most likes, ties newest
create view public.current_product_versions
with (security_invoker = on) as
select distinct on (pv.product_id)
  pv.*, p.barcode, p.source, p.is_generic
from public.product_versions pv
join public.products p on p.id = pv.product_id
order by pv.product_id, pv.like_count desc, pv.created_at desc;

grant select on public.current_product_versions to authenticated;

-- ============================================================
-- LIKES & REPORTS
-- ============================================================
create table public.version_likes (
  user_id uuid not null references public.profiles(id) on delete cascade,
  version_id uuid not null references public.product_versions(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, version_id)
);

alter table public.version_likes enable row level security;
create policy "likes public read" on public.version_likes
  for select to authenticated using (true);
create policy "likes own insert" on public.version_likes
  for insert to authenticated with check (user_id = auth.uid());
create policy "likes own delete" on public.version_likes
  for delete to authenticated using (user_id = auth.uid());

create function public.sync_like_count()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.product_versions set like_count = like_count + 1 where id = new.version_id;
    return new;
  else
    update public.product_versions set like_count = greatest(like_count - 1, 0) where id = old.version_id;
    return old;
  end if;
end;
$$;

create trigger on_like_change
  after insert or delete on public.version_likes
  for each row execute function public.sync_like_count();

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid references public.profiles(id) on delete set null,
  version_id uuid not null references public.product_versions(id) on delete cascade,
  reason text not null check (reason in ('wrong_macros','wrong_allergens','spam','duplicate','other')),
  note text,
  status text not null default 'open' check (status in ('open','resolved')),
  created_at timestamptz not null default now()
);

alter table public.reports enable row level security;
create policy "reports own read" on public.reports
  for select to authenticated using (reporter_id = auth.uid());
create policy "reports own insert" on public.reports
  for insert to authenticated with check (reporter_id = auth.uid());

-- ============================================================
-- DIARY
-- ============================================================
-- meal_slot: 0=breakfast, 1=snack, 2=lunch, 3=snack, 4=dinner, 5=snack
create table public.diary_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  date date not null,
  meal_slot int not null check (meal_slot between 0 and 5),
  product_version_id uuid references public.product_versions(id) on delete set null,
  custom_name text,
  grams numeric check (grams is null or grams > 0),
  kcal numeric not null default 0,
  carbs numeric not null default 0,
  protein numeric not null default 0,
  fat numeric not null default 0,
  logged_at timestamptz not null default now()
);

create index diary_entries_user_date_idx on public.diary_entries (user_id, date);
create index diary_entries_user_logged_idx on public.diary_entries (user_id, logged_at desc);

alter table public.diary_entries enable row level security;
create policy "diary own all" on public.diary_entries
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ============================================================
-- FEEDBACK
-- ============================================================
create table public.feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  message text not null,
  screenshot_url text,
  app_version text,
  session_seconds int,
  days_since_install int,
  created_at timestamptz not null default now()
);

alter table public.feedback enable row level security;
create policy "feedback own read" on public.feedback
  for select to authenticated using (user_id = auth.uid());
create policy "feedback own insert" on public.feedback
  for insert to authenticated with check (user_id = auth.uid());

-- ============================================================
-- RPCS
-- ============================================================

-- Search: generic entries first, then by likes; prefix matches boosted.
create function public.search_products(query text)
returns setof public.current_product_versions
language sql stable
as $$
  select *
  from public.current_product_versions
  where name_nl ilike '%' || query || '%'
     or name_en ilike '%' || query || '%'
     or brand ilike '%' || query || '%'
  order by
    (name_nl ilike query || '%' or name_en ilike query || '%') desc,
    is_generic desc,
    like_count desc,
    coalesce(name_nl, name_en)
  limit 30;
$$;

-- Create product + version 1 atomically. Returns the new version id.
-- If the barcode already exists, returns the existing current version id.
create function public.create_product_full(
  p_barcode text,
  p_source text,
  p_is_generic boolean,
  p_name_nl text,
  p_name_en text,
  p_brand text,
  p_photo_url text,
  p_kcal numeric,
  p_carbs numeric,
  p_protein numeric,
  p_fat numeric,
  p_allergens jsonb,
  p_portions jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_product_id uuid;
  v_version_id uuid;
begin
  if p_barcode is not null then
    select cv.id into v_version_id
    from public.current_product_versions cv where cv.barcode = p_barcode;
    if v_version_id is not null then
      return v_version_id;
    end if;
  end if;

  insert into public.products (barcode, source, is_generic, created_by)
  values (nullif(p_barcode, ''), p_source, p_is_generic,
          case when p_source = 'community' then auth.uid() else null end)
  returning id into v_product_id;

  insert into public.product_versions
    (product_id, version_number, name_nl, name_en, brand, photo_url,
     kcal_100g, carbs_100g, protein_100g, fat_100g, allergens, portions, edited_by)
  values
    (v_product_id, 1, nullif(p_name_nl,''), nullif(p_name_en,''), nullif(p_brand,''), nullif(p_photo_url,''),
     p_kcal, p_carbs, p_protein, p_fat,
     coalesce(p_allergens, '{}'::jsonb), coalesce(p_portions, '[]'::jsonb),
     case when p_source = 'community' then auth.uid() else null end)
  returning id into v_version_id;

  return v_version_id;
end;
$$;

-- New version of an existing product (community edit). Returns new version id.
create function public.create_product_version(
  p_product_id uuid,
  p_name_nl text,
  p_name_en text,
  p_brand text,
  p_photo_url text,
  p_kcal numeric,
  p_carbs numeric,
  p_protein numeric,
  p_fat numeric,
  p_allergens jsonb,
  p_portions jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_next int;
  v_version_id uuid;
begin
  select coalesce(max(version_number), 0) + 1 into v_next
  from public.product_versions where product_id = p_product_id;

  insert into public.product_versions
    (product_id, version_number, name_nl, name_en, brand, photo_url,
     kcal_100g, carbs_100g, protein_100g, fat_100g, allergens, portions, edited_by)
  values
    (p_product_id, v_next, nullif(p_name_nl,''), nullif(p_name_en,''), nullif(p_brand,''), nullif(p_photo_url,''),
     p_kcal, p_carbs, p_protein, p_fat,
     coalesce(p_allergens, '{}'::jsonb), coalesce(p_portions, '[]'::jsonb), auth.uid())
  returning id into v_version_id;

  return v_version_id;
end;
$$;

-- GDPR account deletion: cascades wipe personal data; contributions are
-- anonymized via ON DELETE SET NULL on created_by/edited_by.
create function public.delete_account()
returns void
language plpgsql security definer set search_path = public
as $$
begin
  delete from auth.users where id = auth.uid();
end;
$$;

revoke execute on function public.delete_account() from anon, public;
grant execute on function public.delete_account() to authenticated;

-- ============================================================
-- STORAGE
-- ============================================================
insert into storage.buckets (id, name, public) values ('product-photos', 'product-photos', true);
insert into storage.buckets (id, name, public) values ('feedback', 'feedback', false);

create policy "product photos public read" on storage.objects
  for select using (bucket_id = 'product-photos');
create policy "product photos authenticated upload" on storage.objects
  for insert to authenticated with check (bucket_id = 'product-photos');
create policy "feedback owner upload" on storage.objects
  for insert to authenticated with check (bucket_id = 'feedback' and owner = auth.uid());
create policy "feedback owner read" on storage.objects
  for select to authenticated using (bucket_id = 'feedback' and owner = auth.uid());
