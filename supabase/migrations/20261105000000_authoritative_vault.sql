-- Server-authoritative writes. Apply after the two existing migrations.
begin;
revoke insert,update,delete on public.memories,public.notes,public.memory_stores from anon,authenticated;
grant select on public.memories,public.notes to authenticated;
revoke all on public.memory_stores from anon,authenticated;
-- Provider resource identifiers must never be writable from the Data API.
drop policy if exists "own store" on public.memory_stores;
drop policy if exists "own memories" on public.memories;
create policy "read own memories" on public.memories for select to authenticated using((select auth.uid())=user_id);
drop policy if exists "own notes" on public.notes;
create policy "read own notes" on public.notes for select to authenticated using((select auth.uid())=user_id and exists(select 1 from public.memories m where m.id=memory_id and m.user_id=(select auth.uid())));
drop policy if exists "own reminders" on public.reminders;
create policy "own reminders" on public.reminders for all to authenticated
using((select auth.uid())=user_id)
with check((select auth.uid())=user_id and (source_memory_id is null or exists(select 1 from public.memories m where m.id=source_memory_id and m.user_id=(select auth.uid()))));
-- Browser uploads cannot bypass server validation or quota reservation.
drop policy if exists "Allow authenticated users to upload to their own folder" on storage.objects;
drop policy if exists "Allow authenticated users to update their own files" on storage.objects;
drop policy if exists "Allow authenticated users to delete their own files" on storage.objects;
update storage.buckets set public=false,file_size_limit=15728640,allowed_mime_types=array['application/pdf','text/plain','text/markdown','text/csv','application/json','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','image/png','image/jpeg','image/webp'] where id='memory-files';

alter table public.memories add constraint memory_title_length check(length(title) between 1 and 200) not valid;
alter table public.memories add constraint memory_content_length check(length(coalesce(content,''))<=200000) not valid;
alter table public.memories add constraint memory_nonnegative_size check(file_size is null or file_size>=0) not valid;
alter table public.reminders add constraint reminder_title_length check(length(title) between 1 and 200) not valid;
alter table public.reminders add constraint reminder_description_length check(length(coalesce(description,''))<=4000) not valid;
alter table public.messages add constraint message_length check(length(content) between 1 and 16000) not valid;

create function public.enforce_vault_quota() returns trigger language plpgsql set search_path='' as $$
declare used bigint;
begin
  perform pg_advisory_xact_lock(hashtextextended(new.user_id::text,0));
  if new.storage_path is not null and new.storage_path not like new.user_id::text||'/%' then raise exception 'Invalid attachment path'; end if;
  -- Count originals and extracted UTF-8 text, including metadata-only notes.
  new.file_size:=greatest(coalesce(new.file_size,0),octet_length(coalesce(new.content,'')));
  select coalesce(sum(file_size),0) into used from public.memories where user_id=new.user_id and id<>new.id;
  if used+new.file_size>5368709120 then raise exception 'Vault storage limit exceeded';end if;
  return new;
end $$;
revoke all on function public.enforce_vault_quota() from public,anon,authenticated;
create trigger enforce_vault_quota before insert or update on public.memories for each row execute function public.enforce_vault_quota();

create table public.request_usage(user_id uuid not null references auth.users on delete cascade,action text not null,window_start timestamptz not null,requests integer not null default 0,primary key(user_id,action,window_start));
alter table public.request_usage enable row level security;
revoke all on public.request_usage from anon,authenticated;
create function public.consume_request(p_user uuid,p_action text) returns boolean language plpgsql security definer set search_path='' as $$
declare n integer;cap integer;
begin
  cap:=case when p_action in ('ai','ask-memory') then 30 else 120 end;
  insert into public.request_usage(user_id,action,window_start,requests) values(p_user,p_action,date_trunc('hour',now()),1)
  on conflict(user_id,action,window_start) do update set requests=public.request_usage.requests+1 returning requests into n;
  -- Bounded housekeeping; old usage contains no document text.
  delete from public.request_usage where user_id=p_user and window_start<now()-interval '2 days';
  return n<=cap;
end $$;
revoke all on function public.consume_request(uuid,text) from public,anon,authenticated;
grant execute on function public.consume_request(uuid,text) to service_role;

create table public.memory_chunks(id uuid primary key default gen_random_uuid(),memory_id uuid not null references public.memories on delete cascade,user_id uuid not null references auth.users on delete cascade,title text not null,content text not null,search tsvector generated always as(to_tsvector('simple',title||' '||content)) stored);
create index memory_chunks_search on public.memory_chunks using gin(search);
create index memory_chunks_user on public.memory_chunks(user_id,memory_id);
alter table public.memory_chunks enable row level security;
revoke all on public.memory_chunks from anon,authenticated;
grant select on public.memory_chunks to authenticated;
create policy "read own chunks" on public.memory_chunks for select to authenticated using((select auth.uid())=user_id);
create function public.refresh_memory_chunks() returns trigger language plpgsql security definer set search_path='' as $$
begin
  delete from public.memory_chunks where memory_id=new.id;
  if new.indexing_status='ready' and length(coalesce(new.content,''))>0 then
    insert into public.memory_chunks(memory_id,user_id,title,content)
    select new.id,new.user_id,new.title,substring(new.content from i for 3000) from generate_series(1,length(new.content),2600) i;
  end if;
  return new;
end $$;
revoke all on function public.refresh_memory_chunks() from public,anon,authenticated;
create trigger refresh_memory_chunks after insert or update of title,content,indexing_status on public.memories for each row execute function public.refresh_memory_chunks();
insert into public.memory_chunks(memory_id,user_id,title,content) select m.id,m.user_id,m.title,substring(m.content from i for 3000) from public.memories m cross join lateral generate_series(1,length(m.content),2600) i where m.indexing_status='ready' and length(coalesce(m.content,''))>0;
create function public.search_memory_chunks(p_query text) returns table(id uuid,title text,original_file_name text,type text,content text) language sql stable security invoker set search_path='' as $$
  with terms as(select string_agg(quote_literal(word),' | ') as q from(select distinct lower(t[1]) as word from regexp_matches(left(p_query,3000),'([[:alnum:]]{3,})','g') t limit 40) words),query as(select to_tsquery('simple',coalesce(q,'')) q from terms)
  select m.id,m.title,m.original_file_name,m.type,c.content from public.memory_chunks c join public.memories m on m.id=c.memory_id cross join query q
  where c.user_id=(select auth.uid()) and m.user_id=(select auth.uid()) and c.search@@q.q order by ts_rank_cd(c.search,q.q) desc,c.id limit 12;
$$;
revoke all on function public.search_memory_chunks(text) from public,anon;
grant execute on function public.search_memory_chunks(text) to authenticated;
create function public.vault_stats() returns jsonb language sql stable security invoker set search_path='' as $$
 select jsonb_build_object('total',count(*),'documents',count(*) filter(where type='document'),'images',count(*) filter(where type='image'),'notes',count(*) filter(where type='note'),'storageBytes',coalesce(sum(file_size),0),'storageLimitBytes',5368709120) from public.memories where user_id=(select auth.uid());
$$;
revoke all on function public.vault_stats() from public,anon;
grant execute on function public.vault_stats() to authenticated;
-- Message ordering is stable and both roles are persisted atomically by the server RPC.
create function public.save_chat(p_id uuid,p_title text,p_messages jsonb) returns void language plpgsql security definer set search_path='' as $$
declare caller uuid;message jsonb;idx integer:=0;
begin
 caller:=auth.uid();if caller is null then raise exception 'Unauthorized';end if;
 if length(p_title)>200 or jsonb_typeof(p_messages)<>'array' or jsonb_array_length(p_messages)>200 then raise exception 'Invalid conversation';end if;
 perform pg_advisory_xact_lock(hashtextextended(p_id::text,1));
 if exists(select 1 from public.conversations where id=p_id and user_id<>caller) then raise exception 'Conversation access denied';end if;
 insert into public.conversations(id,user_id,title) values(p_id,caller,p_title) on conflict(id) do update set title=excluded.title,updated_at=now();
 for message in select * from jsonb_array_elements(p_messages) loop
   if (message->>'role') not in ('user','assistant') or length(coalesce(message->>'content','')) not between 1 and 16000 then raise exception 'Invalid message';end if;
   if exists(select 1 from public.messages where id=(message->>'id')::uuid and (user_id<>caller or conversation_id<>p_id)) then raise exception 'Message access denied';end if;
   insert into public.messages(id,conversation_id,user_id,role,content,sources,created_at) values((message->>'id')::uuid,p_id,caller,message->>'role',message->>'content',coalesce(message->'sources','[]'),now()+idx*interval '1 millisecond') on conflict(id) do nothing;
   idx:=idx+1;
 end loop;
end $$;
revoke all on function public.save_chat(uuid,text,jsonb) from public,anon;
grant execute on function public.save_chat(uuid,text,jsonb) to authenticated;
commit;
