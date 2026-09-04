-- OnStood production hardening — applied 2026-09-04.
-- Intentionally behavior-preserving: no application access rules are widened.

alter table public.academic_drive_exported_ids enable row level security;

alter function public.onstood_redact_pii(text) set search_path = '';
alter function public.onstood_quality_score(text) set search_path = '';
alter function public.onstood_academic_search_vector(text, text) set search_path = '';

create index if not exists onstood_knowledge_chunks_owner_id_idx on public.onstood_knowledge_chunks(owner_id);
create index if not exists onstood_knowledge_photo_chunks_owner_id_idx on public.onstood_knowledge_photo_chunks(owner_id);
create index if not exists onstood_knowledge_post_chunks_owner_id_idx on public.onstood_knowledge_post_chunks(owner_id);
create index if not exists onstood_knowledge_posts_owner_id_idx on public.onstood_knowledge_posts(owner_id);

drop index if exists public.ai_cost_events_created_idx;
drop index if exists public.ai_cost_events_quality_created_idx;
