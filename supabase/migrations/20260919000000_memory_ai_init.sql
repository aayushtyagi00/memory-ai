-- ==============================================================================
-- MEMORY AI: Complete Database Schema Migration
-- Matches Build Specification Section 4
-- ==============================================================================

-- 1. PROFILES
create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  email text,
  display_name text,
  avatar_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 2. MEMORY_STORES: one Gemini File Search Store per user
create table if not exists public.memory_stores (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users on delete cascade,
  gemini_store_name text not null,
  display_name text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 3. MEMORIES
create table if not exists public.memories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  title text not null,
  description text,
  type text not null check (type in ('document','image','note')),
  category text,
  tags jsonb default '[]'::jsonb,
  storage_path text,
  original_file_name text,
  mime_type text,
  file_size bigint,
  gemini_document_name text,
  gemini_file_name text,
  gemini_store_name text,
  indexing_status text not null default 'pending'
    check (indexing_status in ('pending','processing','ready','failed')),
  indexing_error text,
  is_favorite boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists idx_memories_user_id on public.memories(user_id);
create index if not exists idx_memories_created_at on public.memories(created_at desc);
create index if not exists idx_memories_category on public.memories(category);

-- 4. NOTES (manual notes; the searchable text representation is indexed in File Search)
create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  memory_id uuid references public.memories on delete cascade,
  content text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists idx_notes_user_id on public.notes(user_id);

-- 5. CONVERSATIONS & MESSAGES
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  title text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists idx_conversations_user_id on public.conversations(user_id);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  role text not null check (role in ('user','assistant')),
  content text not null,
  sources jsonb,
  created_at timestamptz default now()
);
create index if not exists idx_messages_conversation_id on public.messages(conversation_id);

-- 6. REMINDERS
create table if not exists public.reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  title text not null,
  description text,
  due_at timestamptz,
  source_memory_id uuid references public.memories on delete set null,
  status text not null default 'pending' check (status in ('pending','completed')),
  created_at timestamptz default now()
);
create index if not exists idx_reminders_user_id on public.reminders(user_id);

-- 7. AUTO-CREATE PROFILE TRIGGER
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, display_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)))
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 8. ROW LEVEL SECURITY (RLS) POLICIES
alter table public.profiles enable row level security;
alter table public.memory_stores enable row level security;
alter table public.memories enable row level security;
alter table public.notes enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.reminders enable row level security;

-- Profiles: Own profile
drop policy if exists "own profile" on public.profiles;
create policy "own profile" on public.profiles for all using (auth.uid() = id) with check (auth.uid() = id);

-- Memory Stores: Own store
drop policy if exists "own store" on public.memory_stores;
create policy "own store" on public.memory_stores for select using (auth.uid() = user_id);

-- Memories: Own memories
drop policy if exists "own memories" on public.memories;
create policy "own memories" on public.memories for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Notes: Own notes
drop policy if exists "own notes" on public.notes;
create policy "own notes" on public.notes for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Conversations: Own conversations
drop policy if exists "own conversations" on public.conversations;
create policy "own conversations" on public.conversations for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Messages: Own messages
drop policy if exists "own messages" on public.messages;
create policy "own messages" on public.messages for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Reminders: Own reminders
drop policy if exists "own reminders" on public.reminders;
create policy "own reminders" on public.reminders for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 9. STORAGE CONFIGURATION FOR 'memory-files' BUCKET
insert into storage.buckets (id, name, public)
values ('memory-files', 'memory-files', false)
on conflict (id) do update set public = false;

-- Storage RLS: Users can only access objects inside their own folder prefix {user_id}/*
create policy "Allow authenticated users to read their own files"
on storage.objects for select
to authenticated
using (bucket_id = 'memory-files' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Allow authenticated users to upload to their own folder"
on storage.objects for insert
to authenticated
with check (bucket_id = 'memory-files' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Allow authenticated users to delete their own files"
on storage.objects for delete
to authenticated
using (bucket_id = 'memory-files' and (storage.foldername(name))[1] = auth.uid()::text);
