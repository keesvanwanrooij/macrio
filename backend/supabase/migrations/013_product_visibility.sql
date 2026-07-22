-- Macrio — product visibility (public | private)
-- Run in Supabase SQL Editor after 012.
--
-- Public = community catalog (default). Private = only creator sees in search/scan;
-- barcode allowed; scan prefers public when both exist.

/*
 * SECTION: products.visibility
 * WHAT: public (shared) or private (owner-only pantry-style ingredient)
 */
alter table public.products
  add column if not exists visibility text not null default 'public'
  check (visibility in ('public', 'private'));

-- Public barcodes stay unique; private may reuse the same EAN as a public SKU.
alter table public.products drop constraint if exists products_barcode_key;
create unique index if not exists products_barcode_public_unique
  on public.products (barcode)
  where barcode is not null and visibility = 'public';

-- RLS: private products only for owner
drop policy if exists "products public read" on public.products;
create policy "products readable" on public.products
  for select to authenticated
  using (visibility = 'public' or created_by = auth.uid());

drop policy if exists "products own update" on public.products;
create policy "products own update" on public.products
  for update to authenticated
  using (created_by = auth.uid())
  with check (created_by = auth.uid());

grant update on table public.products to authenticated;

-- Versions: readable if parent product is readable
drop policy if exists "versions public read" on public.product_versions;
create policy "versions readable" on public.product_versions
  for select to authenticated
  using (
    exists (
      select 1 from public.products p
      where p.id = product_id
        and (p.visibility = 'public' or p.created_by = auth.uid())
    )
  );

/*
 * SECTION: current_product_versions (replace)
 * WHAT: Include visibility + created_by for scan preference and UI.
 */
create or replace view public.current_product_versions
with (security_invoker = on) as
select distinct on (pv.product_id)
  pv.*, p.barcode, p.source, p.is_generic, p.visibility, p.created_by as product_created_by
from public.product_versions pv
join public.products p on p.id = pv.product_id
order by pv.product_id, pv.like_count desc, pv.created_at desc;

grant select on public.current_product_versions to authenticated;

/*
 * SECTION: set_product_visibility
 * WHAT: Owner toggles public ↔ private. Public barcode must not collide with another public product.
 */
create or replace function public.set_product_visibility(
  p_product_id uuid,
  p_visibility text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
  v_barcode text;
  v_other uuid;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  if p_visibility not in ('public', 'private') then
    raise exception 'invalid visibility';
  end if;

  select created_by, barcode into v_owner, v_barcode
  from public.products
  where id = p_product_id;

  if not found then
    raise exception 'product not found';
  end if;

  if v_owner is distinct from auth.uid() then
    raise exception 'not product owner';
  end if;

  if p_visibility = 'public' and v_barcode is not null then
    select id into v_other
    from public.products
    where barcode = v_barcode
      and visibility = 'public'
      and id <> p_product_id
    limit 1;
    if v_other is not null then
      raise exception 'barcode already used by another product';
    end if;
  end if;

  update public.products
  set visibility = p_visibility
  where id = p_product_id;
end;
$$;

revoke all on function public.set_product_visibility(uuid, text) from public;
grant execute on function public.set_product_visibility(uuid, text) to authenticated;

-- Uniqueness for set/update barcode: only against other public products
create or replace function public.set_product_barcode(
  p_product_id uuid,
  p_barcode text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current text;
  v_other uuid;
  v_code text;
  v_keys text[];
  v_vis text;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  v_code := public.normalize_barcode(p_barcode);
  if v_code is null then
    raise exception 'invalid barcode';
  end if;

  select barcode, visibility into v_current, v_vis
  from public.products
  where id = p_product_id;

  if not found then
    raise exception 'product not found';
  end if;

  if v_current is not null and length(trim(v_current)) > 0 then
    raise exception 'barcode already set';
  end if;

  v_keys := public.barcode_lookup_keys(v_code);

  -- Public products cannot reuse another public product's barcode
  if coalesce(v_vis, 'public') = 'public' then
    select id into v_other
    from public.products
    where id <> p_product_id
      and visibility = 'public'
      and barcode = any (v_keys)
    limit 1;
    if v_other is not null then
      raise exception 'barcode already used by another product';
    end if;
  end if;

  update public.products
  set barcode = v_code
  where id = p_product_id;
end;
$$;

create or replace function public.update_product_barcode(
  p_product_id uuid,
  p_barcode text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_other uuid;
  v_code text;
  v_keys text[];
  v_vis text;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  v_code := public.normalize_barcode(p_barcode);
  if v_code is null then
    raise exception 'invalid barcode';
  end if;

  select visibility into v_vis
  from public.products
  where id = p_product_id;

  if not found then
    raise exception 'product not found';
  end if;

  v_keys := public.barcode_lookup_keys(v_code);

  if coalesce(v_vis, 'public') = 'public' then
    select id into v_other
    from public.products
    where id <> p_product_id
      and visibility = 'public'
      and barcode = any (v_keys)
    limit 1;
    if v_other is not null then
      raise exception 'barcode already used by another product';
    end if;
  end if;

  update public.products
  set barcode = v_code
  where id = p_product_id;
end;
$$;

/*
 * SECTION: create_product_full (replace with visibility)
 * Drop old signature first to avoid overload ambiguity.
 */
drop function if exists public.create_product_full(
  text, text, boolean, text, text, text, text,
  numeric, numeric, numeric, numeric, jsonb, jsonb
);

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
  p_portions jsonb,
  p_visibility text default 'public'
)
returns uuid
language plpgsql
as $$
declare
  v_product_id uuid;
  v_version_id uuid;
  v_code text;
  v_keys text[];
  v_vis text;
begin
  v_vis := coalesce(nullif(trim(p_visibility), ''), 'public');
  if v_vis not in ('public', 'private') then
    raise exception 'invalid visibility';
  end if;

  v_code := public.normalize_barcode(p_barcode);

  if v_code is not null then
    v_keys := public.barcode_lookup_keys(v_code);
    if v_vis = 'public' then
      select cv.id into v_version_id
      from public.current_product_versions cv
      where cv.barcode = any (v_keys)
        and cv.visibility = 'public'
      limit 1;
    else
      select cv.id into v_version_id
      from public.current_product_versions cv
      where cv.barcode = any (v_keys)
        and cv.visibility = 'private'
        and cv.product_created_by = auth.uid()
      limit 1;
    end if;
    if v_version_id is not null then
      return v_version_id;
    end if;
  end if;

  insert into public.products (barcode, source, is_generic, created_by, visibility)
  values (
    v_code,
    p_source,
    p_is_generic,
    case when p_source = 'community' then auth.uid() else null end,
    case when p_source = 'community' then v_vis else 'public' end
  )
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

grant execute on function public.create_product_full(
  text, text, boolean, text, text, text, text,
  numeric, numeric, numeric, numeric, jsonb, jsonb, text
) to authenticated;

-- Prefer public matches in search ordering
create or replace function public.search_products(query text)
returns setof public.current_product_versions
language sql
stable
security invoker
as $$
  select *
  from public.current_product_versions
  where name_nl ilike '%' || query || '%'
     or name_en ilike '%' || query || '%'
     or brand ilike '%' || query || '%'
  order by
    (visibility = 'public') desc,
    (name_nl ilike query || '%' or name_en ilike query || '%') desc,
    is_generic desc,
    like_count desc,
    coalesce(name_nl, name_en)
  limit 30;
$$;

grant execute on function public.search_products(text) to authenticated;
grant execute on function public.set_product_barcode(uuid, text) to authenticated;
grant execute on function public.update_product_barcode(uuid, text) to authenticated;
