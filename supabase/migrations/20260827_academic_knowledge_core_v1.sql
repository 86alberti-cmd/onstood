create table if not exists public.academic_knowledge_items (
  id uuid primary key default gen_random_uuid(),
  external_id text unique,
  title text not null,
  abstract_text text,
  institution text,
  country text,
  authors jsonb not null default '[]'::jsonb,
  topics text[] not null default '{}',
  source_url text not null,
  doi text,
  language text,
  license_code text,
  license_url text,
  rights_status text not null default 'review' check (rights_status in ('allowed','review','blocked')),
  source_type text not null default 'academic_repository',
  is_open_access boolean not null default false,
  is_retracted boolean not null default false,
  quality_score numeric(6,2) not null default 0,
  published_at timestamptz,
  harvested_at timestamptz not null default now(),
  is_active boolean not null default false,
  metadata jsonb not null default '{}'::jsonb
);
create index if not exists academic_knowledge_items_active_quality_idx on public.academic_knowledge_items(is_active, quality_score desc);
create index if not exists academic_knowledge_items_topics_gin on public.academic_knowledge_items using gin(topics);
alter table public.academic_knowledge_items enable row level security;
drop policy if exists "academic knowledge readable" on public.academic_knowledge_items;
create policy "academic knowledge readable" on public.academic_knowledge_items for select to authenticated using (is_active = true and rights_status = 'allowed' and is_open_access = true and is_retracted = false);
comment on table public.academic_knowledge_items is 'ONSTOOD Academic Knowledge Core metadata. Activate only material whose license/rights permit ONSTOOD use.';
