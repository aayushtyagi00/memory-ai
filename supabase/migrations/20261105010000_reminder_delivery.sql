begin;
alter table public.profiles add column email_reminders boolean not null default false;
alter table public.reminders add column delivered_at timestamptz;
alter table public.reminders add column delivery_lease_until timestamptz;
alter table public.reminders add column delivery_attempts integer not null default 0;
-- Delivery bookkeeping is server-only; clients retain the fields used by the reminder UI.
revoke insert,update on public.reminders from authenticated;
grant insert(user_id,title,description,due_at,source_memory_id,status) on public.reminders to authenticated;
grant update(title,description,due_at,source_memory_id,status) on public.reminders to authenticated;
create function public.claim_due_reminders() returns setof public.reminders language sql security definer set search_path='' as $$
 update public.reminders r set delivery_lease_until=now()+interval '5 minutes',delivery_attempts=delivery_attempts+1
 where r.id in(select d.id from public.reminders d join public.profiles p on p.id=d.user_id where p.email_reminders and d.status='pending' and d.due_at<=now() and d.delivered_at is null and d.delivery_attempts<5 and (d.delivery_lease_until is null or d.delivery_lease_until<now()) order by d.due_at for update of d skip locked limit 25)
 returning r.*;
$$;
revoke all on function public.claim_due_reminders() from public,anon,authenticated;
grant execute on function public.claim_due_reminders() to service_role;
create function public.reset_reminder_delivery() returns trigger language plpgsql set search_path='' as $$
begin
 if new.due_at is distinct from old.due_at then new.delivered_at:=null;new.delivery_lease_until:=null;new.delivery_attempts:=0;end if;
 return new;
end $$;
revoke all on function public.reset_reminder_delivery() from public,anon,authenticated;
create trigger reset_reminder_delivery before update of due_at on public.reminders for each row execute function public.reset_reminder_delivery();
-- Serialize duplicate creation and bound direct Data API writes.
create function public.limit_reminders() returns trigger language plpgsql set search_path='' as $$
begin
 perform pg_advisory_xact_lock(hashtextextended(new.user_id::text,2));
 if (select count(*) from public.reminders where user_id=new.user_id and id<>new.id)>=2000 then raise exception 'Reminder limit exceeded';end if;
 if exists(select 1 from public.reminders where user_id=new.user_id and id<>new.id and lower(title)=lower(new.title) and due_at is not distinct from new.due_at and source_memory_id is not distinct from new.source_memory_id) then raise exception using message='This reminder already exists',errcode='23505';end if;
 return new;
end $$;
revoke all on function public.limit_reminders() from public,anon,authenticated;
create trigger limit_reminders before insert or update of title,due_at,source_memory_id on public.reminders for each row execute function public.limit_reminders();
-- Chat writes must use the ownership-checked atomic RPC.
revoke insert,update,delete on public.messages from authenticated;
revoke insert,update on public.conversations from authenticated;
commit;
