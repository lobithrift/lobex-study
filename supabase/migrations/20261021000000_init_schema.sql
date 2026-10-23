-- ==============================================================================
-- Lobex-Study Initial Database Schema & RLS Policies
-- Specification: Section 9 of Lobex study.md
-- ==============================================================================

-- 1. PROFILES TABLE
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  role text not null default 'student' check (role in ('student', 'admin')),
  preferred_explanation_level text not null default 'standard' check (preferred_explanation_level in ('simple', 'standard', 'detailed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. STUDY SETS TABLE
create table if not exists public.study_sets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  source_type text default 'topic',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 3. FLASHCARDS TABLE
create table if not exists public.flashcards (
  id uuid primary key default gen_random_uuid(),
  study_set_id uuid not null references public.study_sets(id) on delete cascade,
  front text not null,
  back text not null,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

-- 4. QUIZ ATTEMPTS TABLE
create table if not exists public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  topic text not null,
  difficulty text default 'medium',
  question_count integer not null check (question_count > 0),
  score integer not null check (score >= 0),
  completed_at timestamptz not null default now()
);

-- 5. ACTIVITY EVENTS TABLE (Optional Telemetry / Audit)
create table if not exists public.activity_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Indexes for performance
create index if not exists idx_study_sets_user on public.study_sets(user_id);
create index if not exists idx_flashcards_set on public.flashcards(study_set_id);
create index if not exists idx_quiz_attempts_user on public.quiz_attempts(user_id);
create index if not exists idx_activity_events_user on public.activity_events(user_id);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

alter table public.profiles enable row level security;
alter table public.study_sets enable row level security;
alter table public.flashcards enable row level security;
alter table public.quiz_attempts enable row level security;
alter table public.activity_events enable row level security;

-- Profiles: Users can view & update their own profile; admins can view all
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id or (select role from public.profiles where id = auth.uid()) = 'admin');

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

-- Study Sets: Users can CRUD their own study sets
create policy "Users can select own study sets"
  on public.study_sets for select
  using (auth.uid() = user_id or (select role from public.profiles where id = auth.uid()) = 'admin');

create policy "Users can insert own study sets"
  on public.study_sets for insert
  with check (auth.uid() = user_id);

create policy "Users can update own study sets"
  on public.study_sets for update
  using (auth.uid() = user_id);

create policy "Users can delete own study sets"
  on public.study_sets for delete
  using (auth.uid() = user_id);

-- Flashcards: Verified through ownership of parent study_set
create policy "Users can select own flashcards"
  on public.flashcards for select
  using (
    exists (
      select 1 from public.study_sets
      where public.study_sets.id = public.flashcards.study_set_id
      and (public.study_sets.user_id = auth.uid() or (select role from public.profiles where id = auth.uid()) = 'admin')
    )
  );

create policy "Users can insert own flashcards"
  on public.flashcards for insert
  with check (
    exists (
      select 1 from public.study_sets
      where public.study_sets.id = public.flashcards.study_set_id
      and public.study_sets.user_id = auth.uid()
    )
  );

create policy "Users can update own flashcards"
  on public.flashcards for update
  using (
    exists (
      select 1 from public.study_sets
      where public.study_sets.id = public.flashcards.study_set_id
      and public.study_sets.user_id = auth.uid()
    )
  );

create policy "Users can delete own flashcards"
  on public.flashcards for delete
  using (
    exists (
      select 1 from public.study_sets
      where public.study_sets.id = public.flashcards.study_set_id
      and public.study_sets.user_id = auth.uid()
    )
  );

-- Quiz Attempts: Users can select and insert their own attempts
create policy "Users can select own quiz attempts"
  on public.quiz_attempts for select
  using (auth.uid() = user_id or (select role from public.profiles where id = auth.uid()) = 'admin');

create policy "Users can insert own quiz attempts"
  on public.quiz_attempts for insert
  with check (auth.uid() = user_id);

-- Activity Events: Users can insert and select their own activity
create policy "Users can select own activity events"
  on public.activity_events for select
  using (auth.uid() = user_id or (select role from public.profiles where id = auth.uid()) = 'admin');

create policy "Users can insert own activity events"
  on public.activity_events for insert
  with check (auth.uid() = user_id);

-- ==============================================================================
-- AUTOMATIC PROFILE CREATION TRIGGER
-- ==============================================================================

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name, role, preferred_explanation_level)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    'student',
    'standard'
  );
  return new;
end;
$$ language plpgsql security definer;

-- Trigger execution after auth.users row creation
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
