-- Macrio — enforce GS1 check digit on retail barcodes (EAN-8 / UPC-A / EAN-13)
-- Run in Supabase SQL Editor after 011.

/*
 * SECTION: gs1_check_digit_ok
 * WHAT: True if the last digit matches the GS1 check digit for the preceding digits.
 */
create or replace function public.gs1_check_digit_ok(p_digits text)
returns boolean
language plpgsql
immutable
as $$
declare
  body text;
  chk int;
  sum int := 0;
  i int;
  digit int;
  expected int;
begin
  if p_digits is null or p_digits !~ '^[0-9]+$' or length(p_digits) < 8 then
    return false;
  end if;
  body := left(p_digits, length(p_digits) - 1);
  chk := right(p_digits, 1)::int;
  for i in 0 .. length(body) - 1 loop
    digit := substring(body from length(body) - i for 1)::int;
    sum := sum + digit * (case when i % 2 = 0 then 3 else 1 end);
  end loop;
  expected := (10 - (sum % 10)) % 10;
  return expected = chk;
end;
$$;

/*
 * SECTION: normalize_barcode (replace)
 * WHAT: Canonical EAN-13 only when length + check digit are valid retail codes.
 *       Long / logistics-style codes → NULL (rejected by RPCs as invalid).
 */
create or replace function public.normalize_barcode(p_code text)
returns text
language plpgsql
immutable
as $$
declare
  d text;
  retail text;
  ean13 text;
begin
  if p_code is null then
    return null;
  end if;
  d := regexp_replace(trim(p_code), '[^0-9]', '', 'g');
  if d = '' then
    return null;
  end if;

  -- Too long → GS1-128 / logistics, not a consumer pack code
  if length(d) > 14 then
    return null;
  end if;

  if length(d) = 14 then
    if left(d, 1) <> '0' or not public.gs1_check_digit_ok(d) then
      return null;
    end if;
    retail := substring(d from 2);
  else
    retail := d;
  end if;

  if length(retail) not in (8, 12, 13) then
    return null;
  end if;

  if not public.gs1_check_digit_ok(retail) then
    return null;
  end if;

  ean13 := lpad(retail, 13, '0');
  if not public.gs1_check_digit_ok(ean13) then
    return null;
  end if;

  return ean13;
end;
$$;

-- set / update already call normalize_barcode and raise 'invalid barcode' on null.
-- Recreate them so they pick up the new normalize behavior (same body as 011).

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

grant execute on function public.gs1_check_digit_ok(text) to authenticated;
grant execute on function public.normalize_barcode(text) to authenticated;
revoke all on function public.set_product_barcode(uuid, text) from public;
grant execute on function public.set_product_barcode(uuid, text) to authenticated;
revoke all on function public.update_product_barcode(uuid, text) from public;
grant execute on function public.update_product_barcode(uuid, text) to authenticated;
