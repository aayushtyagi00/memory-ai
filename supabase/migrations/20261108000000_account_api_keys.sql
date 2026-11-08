begin;
create table public.account_api_keys (
 user_id uuid primary key references auth.users(id) on delete cascade,
 api_key text not null unique check (length(api_key) between 10 and 512),
 updated_at timestamptz not null default now()
);
alter table public.account_api_keys enable row level security;
revoke all on public.account_api_keys from public, anon;
grant select, insert, update, delete on public.account_api_keys to authenticated;
create policy own_key on public.account_api_keys for all to authenticated
 using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
commit;
