-- ONSTOOD Knowledge: one-time content-rights declaration
create table if not exists public.onstood_upload_declarations (
  user_id uuid primary key references auth.users(id) on delete cascade,
  terms_version text not null,
  accepted_at timestamptz not null default now(),
  declaration_text text not null
);

alter table public.onstood_upload_declarations enable row level security;

drop policy if exists "upload_declaration_select_own"
on public.onstood_upload_declarations;
create policy "upload_declaration_select_own"
on public.onstood_upload_declarations
for select to authenticated
using (user_id = auth.uid());

drop policy if exists "upload_declaration_insert_own"
on public.onstood_upload_declarations;
create policy "upload_declaration_insert_own"
on public.onstood_upload_declarations
for insert to authenticated
with check (user_id = auth.uid());

drop policy if exists "upload_declaration_update_own"
on public.onstood_upload_declarations;
create policy "upload_declaration_update_own"
on public.onstood_upload_declarations
for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());
