-- Macrio — EAN-13 canonical barcodes + edit/clear RPCs
-- Run in Supabase SQL Editor after 010.
--
-- WHAT: Normalize barcodes to 13 digits; allow update and clear; fix create_product_full lookup.

/*
 * SECTION: normalize_barcode
 * WHAT: Canonical EAN-13 (left-pad 8 or 12 digit codes with 0).
 * INPUT: raw barcode text
 * OUTPUT: 13-digit string, or NULL if empty / invalid length
 */
create or replace function public.normalize_barcode(p_code text)
returns text
language plpgsql
immutable
as $$
declare
  d text;
begin
  if p_code is null then
    return null;
  end if;
  d := regexp_replace(trim(p_code), '[^0-9]', '', 'g');
  if d = '' then
    return null;
  end if;
  if length(d) = 13 then
    return d;
  end if;
  if length(d) = 12 or length(d) = 8 then
    return lpad(d, 13, '0');
  end if;
  -- 14 digits starting with 0 → drop packaging indicator
  if length(d) = 14 and left(d, 1) = '0' then
    return substring(d from 2);
  end if;
  return null;
end;
$$;

/*
 * SECTION: barcode_lookup_keys
 * WHAT: EAN-13 plus optional 12-digit UPC form for alternate matching.
 */
create or replace function public.barcode_lookup_keys(p_code text)
returns text[]
language plpgsql
immutable
as $$
declare
  n text;
  keys text[] := '{}';
begin
  n := public.normalize_barcode(p_code);
  if n is null then
    return keys;
  end if;
  keys := array[n];
  if left(n, 1) = '0' and length(n) = 13 then
    keys := keys || substring(n from 2);
  end if;
  return keys;
end;
$$;

-- One-shot: pad existing 8/12-digit barcodes to 13 when it does not collide.
update public.products p
set barcode = public.normalize_barcode(p.barcode)
where p.barcode is not null
  and public.normalize_barcode(p.barcode) is not null
  and p.barcode is distinct from public.normalize_barcode(p.barcode)
  and not exists (
    select 1
    from public.products o
    where o.id <> p.id
      and o.barcode = public.normalize_barcode(p.barcode)
  );

/*
 * SECTION: set_product_barcode (replace)
 * WHAT: Sets products.barcode when empty; stores EAN-13; uniqueness via lookup keys.
 */
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
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  v_code := public.normalize_barcode(p_barcode);
  if v_code is null then
    raise exception 'invalid barcode';
  end if;

  select barcode into v_current
  from public.products
  where id = p_product_id;

  if not found then
    raise exception 'product not found';
  end if;

  if v_current is not null and length(trim(v_current)) > 0 then
    raise exception 'barcode already set';
  end if;

  v_keys := public.barcode_lookup_keys(v_code);

  select id into v_other
  from public.products
  where id <> p_product_id
    and barcode = any (v_keys)
  limit 1;

  if v_other is not null then
    raise exception 'barcode already used by another product';
  end if;

  update public.products
  set barcode = v_code
  where id = p_product_id;
end;
$$;

/*
 * SECTION: update_product_barcode
 * WHAT: Change an existing product barcode (any authenticated user).
 * INPUT: p_product_id, p_barcode
 * OUTPUT: void; raises on invalid / taken
 */
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
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  v_code := public.normalize_barcode(p_barcode);
  if v_code is null then
    raise exception 'invalid barcode';
  end if;

  if not exists (select 1 from public.products where id = p_product_id) then
    raise exception 'product not found';
  end if;

  v_keys := public.barcode_lookup_keys(v_code);

  select id into v_other
  from public.products
  where id <> p_product_id
    and barcode = any (v_keys)
  limit 1;

  if v_other is not null then
    raise exception 'barcode already used by another product';
  end if;

  update public.products
  set barcode = v_code
  where id = p_product_id;
end;
$$;

/*
 * SECTION: clear_product_barcode
 * WHAT: Remove barcode from a product so it can be re-attached later.
 */
create or replace function public.clear_product_barcode(p_product_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  if not exists (select 1 from public.products where id = p_product_id) then
    raise exception 'product not found';
  end if;

  update public.products
  set barcode = null
  where id = p_product_id;
end;
$$;

/*
 * SECTION: create_product_full (replace)
 * WHAT: Create product + v1; duplicate check uses 12/13 lookup keys; stores EAN-13.
 */
create or replace function public.create_product_full(
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
  v_code text;
  v_keys text[];
begin
  v_code := public.normalize_barcode(p_barcode);

  if v_code is not null then
    v_keys := public.barcode_lookup_keys(v_code);
    select cv.id into v_version_id
    from public.current_product_versions cv
    where cv.barcode = any (v_keys)
    limit 1;
    if v_version_id is not null then
      return v_version_id;
    end if;
  end if;

  insert into public.products (barcode, source, is_generic, created_by)
  values (v_code, p_source, p_is_generic,
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

grant execute on function public.create_product_full(
  text, text, boolean, text, text, text, text,
  numeric, numeric, numeric, numeric, jsonb, jsonb
) to authenticated;

revoke all on function public.set_product_barcode(uuid, text) from public;
grant execute on function public.set_product_barcode(uuid, text) to authenticated;

revoke all on function public.update_product_barcode(uuid, text) from public;
grant execute on function public.update_product_barcode(uuid, text) to authenticated;

revoke all on function public.clear_product_barcode(uuid) from public;
grant execute on function public.clear_product_barcode(uuid) to authenticated;

-- Helpers are used only inside RPCs; keep execute for authenticated in case of client use later.
grant execute on function public.normalize_barcode(text) to authenticated;
grant execute on function public.barcode_lookup_keys(text) to authenticated;
