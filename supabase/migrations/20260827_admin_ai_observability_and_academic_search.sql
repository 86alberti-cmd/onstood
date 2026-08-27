alter table public.ai_cost_events add column if not exists knowledge_assisted boolean not null default false;
alter table public.ai_cost_events add column if not exists knowledge_context_chars integer not null default 0;
alter table public.ai_cost_events add column if not exists knowledge_context_tokens_est integer not null default 0;
alter table public.ai_cost_events add column if not exists knowledge_source_count integer not null default 0;
alter table public.ai_cost_events add column if not exists answer_language text;
create index if not exists ai_cost_events_created_at_idx on public.ai_cost_events(created_at desc);
create index if not exists ai_cost_events_knowledge_idx on public.ai_cost_events(knowledge_assisted, created_at desc);

create or replace function public.onstood_academic_knowledge_search(search_text text, match_count integer default 5)
returns table(source_id uuid,title text,content text,rank real,source_name text,source_url text,doi text,institutions text[],authors text[],publication_year integer,license text)
language sql stable security definer set search_path=public as $$
 with q as (select websearch_to_tsquery('simple', coalesce(search_text,'')) query)
 select w.id,w.title,w.abstract_text,ts_rank_cd(w.fts,q.query)::real,w.source_name,w.source_url,w.doi,w.institution_names,w.author_names,w.publication_year,w.license
 from public.onstood_academic_works w,q
 where w.access_mode='indexed' and w.rights_status='allowed' and w.is_retracted=false and w.abstract_text is not null and w.fts @@ q.query
 order by ts_rank_cd(w.fts,q.query) desc, w.cited_by_count desc nulls last
 limit greatest(1,least(coalesce(match_count,5),10));
$$;
revoke all on function public.onstood_academic_knowledge_search(text,integer) from public,anon,authenticated;
grant execute on function public.onstood_academic_knowledge_search(text,integer) to service_role;

create or replace function public.admin_observability_snapshot(p_from timestamptz default date_trunc('day',now()), p_to timestamptz default now()) returns jsonb language plpgsql security definer set search_path=public as $$
declare v_uid uuid:=auth.uid(); v_role text; result jsonb;
begin
 select role into v_role from public.admin_memberships where user_id=v_uid and active=true limit 1;
 if v_role is null then raise exception 'Admin access required'; end if;
 select jsonb_build_object(
  'period_from',p_from,'period_to',p_to,
  'ai',jsonb_build_object('requests',count(*),'standard_requests',count(*) filter(where mode='standard'),'advanced_requests',count(*) filter(where mode='advanced'),'knowledge_assisted',count(*) filter(where knowledge_assisted),'ai_only',count(*) filter(where not knowledge_assisted),'input_tokens',coalesce(sum(input_tokens),0),'cached_input_tokens',coalesce(sum(cached_input_tokens),0),'output_tokens',coalesce(sum(output_tokens),0),'knowledge_context_tokens_est',coalesce(sum(knowledge_context_tokens_est),0),'cost_usd',coalesce(sum(estimated_cost_usd),0),'avg_cost_usd',coalesce(avg(estimated_cost_usd),0)),
  'knowledge',(select jsonb_build_object('total',count(*),'indexed',count(*) filter(where access_mode='indexed'),'reference_only',count(*) filter(where access_mode='reference_only'),'added_today',count(*) filter(where imported_at>=date_trunc('day',now())),'institutions',(select count(distinct x) from public.onstood_academic_works aw cross join lateral unnest(coalesce(aw.institution_names,'{}'::text[])) x),'last_added',max(updated_at)) from public.onstood_academic_works),
  'harvester',(select to_jsonb(r) from (select status,seen_count,accepted_count,skipped_count,started_at,finished_at,error from public.onstood_academic_harvest_runs order by id desc limit 1) r)
 ) into result from public.ai_cost_events where created_at>=p_from and created_at<=p_to;
 return result;
end $$;
revoke all on function public.admin_observability_snapshot(timestamptz,timestamptz) from public,anon;
grant execute on function public.admin_observability_snapshot(timestamptz,timestamptz) to authenticated;
