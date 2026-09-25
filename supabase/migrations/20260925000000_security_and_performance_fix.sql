-- ==============================================================================
-- MEMORY AI: Security & Data Integrity Patch
-- Resolves Supabase Security Advisor Warnings & Hardens Database Vault
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. FIX SECURITY DEFINER EXECUTION WARNINGS (public.handle_new_user)
-- Resolves:
--   - "Public Can Execute SECURITY DEFINER Function"
--   - "Signed-In Users Can Execute SECURITY DEFINER Function"
-- ------------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end $$;

-- Explicitly revoke execute privileges from PUBLIC, anon, and authenticated roles
revoke all on function public.handle_new_user() from public;
revoke all on function public.handle_new_user() from anon, authenticated;

-- Ensure internal auth administrator & service roles retain execution privileges
grant execute on function public.handle_new_user() to postgres, service_role, supabase_auth_admin;


-- ------------------------------------------------------------------------------
-- 2. FIX STORAGE OBJECTS RLS POLICIES FOR 'memory-files'
-- Resolves: Missing UPDATE policy causing upsert:true uploads to fail
-- ------------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('memory-files', 'memory-files', false)
on conflict (id) do update set public = false;

-- Read policy
drop policy if exists "Allow authenticated users to read their own files" on storage.objects;
create policy "Allow authenticated users to read their own files"
on storage.objects for select
to authenticated
using (bucket_id = 'memory-files' and (storage.foldername(name))[1] = auth.uid()::text);

-- Insert policy
drop policy if exists "Allow authenticated users to upload to their own folder" on storage.objects;
create policy "Allow authenticated users to upload to their own folder"
on storage.objects for insert
to authenticated
with check (bucket_id = 'memory-files' and (storage.foldername(name))[1] = auth.uid()::text);

-- Update policy (REQUIRED for upsert / re-uploading file with same path)
drop policy if exists "Allow authenticated users to update their own files" on storage.objects;
create policy "Allow authenticated users to update their own files"
on storage.objects for update
to authenticated
using (bucket_id = 'memory-files' and (storage.foldername(name))[1] = auth.uid()::text)
with check (bucket_id = 'memory-files' and (storage.foldername(name))[1] = auth.uid()::text);

-- Delete policy
drop policy if exists "Allow authenticated users to delete their own files" on storage.objects;
create policy "Allow authenticated users to delete their own files"
on storage.objects for delete
to authenticated
using (bucket_id = 'memory-files' and (storage.foldername(name))[1] = auth.uid()::text);


-- ------------------------------------------------------------------------------
-- 3. HARDEN MEMORY STORES RLS
-- Allows authenticated users to safely read and manage their own store record
-- ------------------------------------------------------------------------------
alter table public.memory_stores enable row level security;

drop policy if exists "own store" on public.memory_stores;
create policy "own store" on public.memory_stores
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);


-- ------------------------------------------------------------------------------
-- 4. HARDEN MESSAGES RLS (PREVENT CROSS-CONVERSATION TAMPERING)
-- Ensures messages can only be viewed or inserted if the user owns both the
-- message AND the parent conversation.
-- ------------------------------------------------------------------------------
alter table public.messages enable row level security;

drop policy if exists "own messages" on public.messages;
create policy "own messages" on public.messages
for all
using (
  auth.uid() = user_id
  and exists (
    select 1 from public.conversations c
    where c.id = messages.conversation_id
    and c.user_id = auth.uid()
  )
)
with check (
  auth.uid() = user_id
  and exists (
    select 1 from public.conversations c
    where c.id = messages.conversation_id
    and c.user_id = auth.uid()
  )
);


-- ------------------------------------------------------------------------------
-- 5. AUTOMATIC updated_at TIMESTAMP TRIGGER
-- Ensures modified rows have accurate timestamps for audit trails & cache invalidation
-- ------------------------------------------------------------------------------
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end $$;

revoke all on function public.handle_updated_at() from public;
revoke all on function public.handle_updated_at() from anon, authenticated;
grant execute on function public.handle_updated_at() to postgres, service_role;

-- Attach triggers
drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute function public.handle_updated_at();

drop trigger if exists set_memory_stores_updated_at on public.memory_stores;
create trigger set_memory_stores_updated_at
  before update on public.memory_stores
  for each row execute function public.handle_updated_at();

drop trigger if exists set_memories_updated_at on public.memories;
create trigger set_memories_updated_at
  before update on public.memories
  for each row execute function public.handle_updated_at();

drop trigger if exists set_notes_updated_at on public.notes;
create trigger set_notes_updated_at
  before update on public.notes
  for each row execute function public.handle_updated_at();

drop trigger if exists set_conversations_updated_at on public.conversations;
create trigger set_conversations_updated_at
  before update on public.conversations
  for each row execute function public.handle_updated_at();


-- ------------------------------------------------------------------------------
-- 6. PERFORMANCE & SCALABILITY COMPOUND INDEXES
-- Prevents sequential table scans as the user's personal vault grows
-- ------------------------------------------------------------------------------
create index if not exists idx_memories_user_created_at
  on public.memories(user_id, created_at desc);

create index if not exists idx_memories_user_favorite
  on public.memories(user_id, is_favorite)
  where is_favorite = true;

create index if not exists idx_memories_user_category
  on public.memories(user_id, category);

create index if not exists idx_messages_conv_created_at
  on public.messages(conversation_id, created_at asc);

create index if not exists idx_reminders_user_due_at
  on public.reminders(user_id, status, due_at asc);
