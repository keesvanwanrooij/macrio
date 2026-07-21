-- Macrio v1.0.1 — attach a barcode to a product that was created without one
-- Run in Supabase SQL Editor after 009.
--
-- Symptom: user created a meal/product at home without the pack; later wants to
-- type or scan the barcode so future scans find the same product.

/*
 * SECTION: set_product_barcode
 * WHAT: Sets products.barcode when it is currently empty.
 * HOW: 1) require auth 2) reject if product already has a barcode
 *      3) reject if barcode is used by another product 4) update
 * INPUT: p_product_id, p_barcode (digits string)
 * OUTPUT: void; raises on conflict / already set
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
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  v_code := nullif(trim(p_barcode), '');
  if v_code is null then
    raise exception 'barcode required';
  end if;

  -- Keep only typical retail barcode characters (digits; some UPCs are numeric-only)
  if v_code !~ '^[0-9]{8,14}$' then
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

  select id into v_other
  from public.products
  where barcode = v_code
    and id <> p_product_id
  limit 1;

  if v_other is not null then
    raise exception 'barcode already used by another product';
  end if;

  update public.products
  set barcode = v_code
  where id = p_product_id;
end;
$$;

revoke all on function public.set_product_barcode(uuid, text) from public;
grant execute on function public.set_product_barcode(uuid, text) to authenticated;
