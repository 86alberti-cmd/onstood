alter table public.onstood_academic_works add column if not exists access_mode text not null default 'indexed' check (access_mode in ('indexed','reference_only'));
alter table public.onstood_academic_works add column if not exists redistribution_allowed boolean not null default true;
alter table public.onstood_academic_works add column if not exists fulltext_stored boolean not null default false;
alter table public.onstood_academic_works add column if not exists rights_note text;
create index if not exists onstood_academic_works_access_mode_idx on public.onstood_academic_works(access_mode);
update public.onstood_academic_works set access_mode='indexed', redistribution_allowed=true, fulltext_stored=false, rights_note='License permits ONSTOOD knowledge indexing; original source attribution retained.' where license in ('cc-by','cc0','public-domain');
