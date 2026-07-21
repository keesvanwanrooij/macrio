-- Macrio v1.0.1 — grant table privileges for authenticated (fixes "permission denied for table profiles")
-- Run after 008. RLS policies alone are not enough: roles also need GRANT privileges.
--
-- Symptom: after onboarding, updateProfile fails with permission denied for table profiles.

grant select, insert, update on table public.profiles to authenticated;

-- Core app tables the mobile client reads/writes (policies already exist in 001).
grant select, insert, update, delete on table public.diary_entries to authenticated;
grant select, insert on table public.products to authenticated;
grant select, insert on table public.product_versions to authenticated;
grant select, insert, delete on table public.version_likes to authenticated;
grant select, insert on table public.reports to authenticated;
grant select, insert on table public.feedback to authenticated;
grant select on table public.current_product_versions to authenticated;

-- Sequences if any uuid defaults use them (gen_random_uuid does not); keep for safety on serials.
-- No serial PKs in Macrio schema; skip.
