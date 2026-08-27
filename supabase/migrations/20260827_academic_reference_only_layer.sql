-- ONSTOOD Academic Knowledge
-- Fix: allow reference_only records in rights_status.
-- Applied live to Supabase on 2026-08-27.

alter table public.onstood_academic_works
  drop constraint if exists onstood_academic_rights_check;

alter table public.onstood_academic_works
  add constraint onstood_academic_rights_check
  check (
    rights_status = any (
      array[
        'allowed'::text,
        'review'::text,
        'blocked'::text,
        'reference_only'::text
      ]
    )
  );
