-- ONSTOOD v0.2 additive migration. Safe to run on the existing StudentHub v0.1 schema.
create table if not exists public.post_likes (
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id,user_id)
);
create table if not exists public.post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 500),
  done boolean not null default false,
  due_at timestamptz,
  created_at timestamptz not null default now()
);
create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text,
  university text,
  description text,
  created_at timestamptz not null default now()
);
create table if not exists public.course_members (
  course_id uuid not null references public.courses(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(course_id,user_id)
);
create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  company text,
  location text,
  employment_type text,
  description text,
  url text,
  created_at timestamptz not null default now()
);
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null,
  title text not null,
  body text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.post_likes enable row level security;
alter table public.post_comments enable row level security;
alter table public.tasks enable row level security;
alter table public.courses enable row level security;
alter table public.course_members enable row level security;
alter table public.jobs enable row level security;
alter table public.notifications enable row level security;

create policy "likes visible to authenticated" on public.post_likes for select to authenticated using (true);
create policy "users like posts" on public.post_likes for insert to authenticated with check (auth.uid()=user_id);
create policy "users remove own likes" on public.post_likes for delete to authenticated using (auth.uid()=user_id);
create policy "comments visible to authenticated" on public.post_comments for select to authenticated using (true);
create policy "users create comments" on public.post_comments for insert to authenticated with check (auth.uid()=user_id);
create policy "users delete own comments" on public.post_comments for delete to authenticated using (auth.uid()=user_id);
create policy "own tasks" on public.tasks for all to authenticated using (auth.uid()=user_id) with check (auth.uid()=user_id);
create policy "courses visible to authenticated" on public.courses for select to authenticated using (true);
create policy "memberships visible to authenticated" on public.course_members for select to authenticated using (true);
create policy "users join courses" on public.course_members for insert to authenticated with check (auth.uid()=user_id);
create policy "users leave courses" on public.course_members for delete to authenticated using (auth.uid()=user_id);
create policy "jobs visible to authenticated" on public.jobs for select to authenticated using (true);
create policy "own notifications" on public.notifications for select to authenticated using (auth.uid()=user_id);
create policy "own notification updates" on public.notifications for update to authenticated using (auth.uid()=user_id) with check (auth.uid()=user_id);

create index if not exists posts_created_at_idx on public.posts(created_at desc);
create index if not exists post_likes_post_idx on public.post_likes(post_id);
create index if not exists comments_post_idx on public.post_comments(post_id,created_at);
create index if not exists tasks_user_done_idx on public.tasks(user_id,done,due_at);
create index if not exists events_user_start_idx on public.calendar_events(user_id,starts_at);
create index if not exists documents_user_created_idx on public.documents(user_id,created_at desc);
