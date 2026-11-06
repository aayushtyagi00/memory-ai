begin;
-- Accounts that existed before the profile trigger was installed also need preferences.
insert into public.profiles(id,email,display_name)
select id,email,coalesce(raw_user_meta_data->>'full_name',split_part(email,'@',1)) from auth.users
on conflict(id) do nothing;
create function public.toggle_memory_favorite(p_id uuid) returns setof public.memories
language sql security definer set search_path='' as $$
 update public.memories set is_favorite=not coalesce(is_favorite,false)
 where id=p_id and user_id=(select auth.uid()) returning *;
$$;
revoke all on function public.toggle_memory_favorite(uuid) from public,anon;
grant execute on function public.toggle_memory_favorite(uuid) to authenticated;
create function public.toggle_reminder_status(p_id uuid) returns setof public.reminders
language sql security definer set search_path='' as $$
 update public.reminders set status=case when status='pending' then 'completed' else 'pending' end
 where id=p_id and user_id=(select auth.uid()) returning *;
$$;
revoke all on function public.toggle_reminder_status(uuid) from public,anon;
grant execute on function public.toggle_reminder_status(uuid) to authenticated;
commit;
