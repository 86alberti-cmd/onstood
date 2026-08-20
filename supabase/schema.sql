-- StudentHub v0.1 database
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  surname text not null,
  university text,
  faculty text,
  degree text,
  year text,
  city text,
  avatar_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 5000),
  created_at timestamptz not null default now()
);

create table if not exists public.friend_requests (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles(id) on delete cascade,
  receiver_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','accepted','declined')),
  created_at timestamptz not null default now(),
  unique(sender_id,receiver_id)
);

create table if not exists public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  starts_at timestamptz not null,
  ends_at timestamptz,
  location text,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  file_name text not null,
  storage_path text not null,
  mime_type text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.posts enable row level security;
alter table public.friend_requests enable row level security;
alter table public.calendar_events enable row level security;
alter table public.documents enable row level security;

create policy "profiles readable by authenticated users" on public.profiles for select to authenticated using (true);
create policy "users create own profile" on public.profiles for insert to authenticated with check (auth.uid()=id);
create policy "users update own profile" on public.profiles for update to authenticated using (auth.uid()=id) with check (auth.uid()=id);

create policy "posts readable by authenticated users" on public.posts for select to authenticated using (true);
create policy "users create own posts" on public.posts for insert to authenticated with check (auth.uid()=user_id);
create policy "users delete own posts" on public.posts for delete to authenticated using (auth.uid()=user_id);

create policy "friend requests visible to participants" on public.friend_requests for select to authenticated using (auth.uid()=sender_id or auth.uid()=receiver_id);
create policy "send own friend requests" on public.friend_requests for insert to authenticated with check (auth.uid()=sender_id);
create policy "receiver updates request" on public.friend_requests for update to authenticated using (auth.uid()=receiver_id);

create policy "own calendar" on public.calendar_events for all to authenticated using (auth.uid()=user_id) with check (auth.uid()=user_id);
create policy "own documents" on public.documents for all to authenticated using (auth.uid()=user_id) with check (auth.uid()=user_id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles(id,name,surname,university,degree,year)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name',''),
    coalesce(new.raw_user_meta_data->>'surname',''),
    new.raw_user_meta_data->>'university',
    new.raw_user_meta_data->>'degree',
    new.raw_user_meta_data->>'year'
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- Storage bucket for private student documents.
insert into storage.buckets (id,name,public) values ('student-documents','student-documents',false)
on conflict (id) do nothing;

create policy "students upload own documents" on storage.objects
for insert to authenticated
with check (bucket_id='student-documents' and (storage.foldername(name))[1]=auth.uid()::text);

create policy "students read own documents" on storage.objects
for select to authenticated
using (bucket_id='student-documents' and (storage.foldername(name))[1]=auth.uid()::text);

create policy "students delete own documents" on storage.objects
for delete to authenticated
using (bucket_id='student-documents' and (storage.foldername(name))[1]=auth.uid()::text);
