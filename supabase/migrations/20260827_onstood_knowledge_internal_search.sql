-- Already applied to production Supabase.
-- ONSTOOD-only searchable knowledge, no external AI embeddings.
alter table public.onstood_knowledge_chunks
  add column if not exists fts tsvector
  generated always as (to_tsvector('simple', coalesce(content, ''))) stored;

create index if not exists onstood_knowledge_chunks_fts_idx
  on public.onstood_knowledge_chunks using gin (fts);

create or replace function public.onstood_private_knowledge_search(
  search_text text,
  match_count integer default 5
)
returns table (
  chunk_id bigint,
  knowledge_document_id uuid,
  document_id uuid,
  file_name text,
  content text,
  rank real
)
language sql stable security definer set search_path = public
as $$
  select c.id, c.knowledge_document_id, kd.document_id, d.file_name,
         c.content,
         ts_rank(c.fts, websearch_to_tsquery('simple', search_text))
  from public.onstood_knowledge_chunks c
  join public.onstood_knowledge_documents kd on kd.id = c.knowledge_document_id
  join public.documents d on d.id = kd.document_id
  where kd.status = 'ready'
    and kd.source_scope = 'onstood_only'
    and kd.external_ai_allowed = false
    and d.ai_opt_in = true
    and d.visibility = 'onstood_ai'
    and c.fts @@ websearch_to_tsquery('simple', search_text)
  order by 6 desc, c.id asc
  limit greatest(1, least(coalesce(match_count, 5), 10));
$$;

revoke all on function public.onstood_private_knowledge_search(text, integer) from public;
revoke all on function public.onstood_private_knowledge_search(text, integer) from anon;
revoke all on function public.onstood_private_knowledge_search(text, integer) from authenticated;
grant execute on function public.onstood_private_knowledge_search(text, integer) to service_role;
