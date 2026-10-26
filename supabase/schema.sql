-- =====================================================================
-- HabitFlow database schema
-- =====================================================================
-- How to use:
--   1. Open your Supabase project → SQL Editor → New query.
--   2. Paste this whole file and click "Run".
--
-- The script is safe to run more than once: it only creates what is
-- missing and refreshes functions, triggers and policies.
--
-- Security model (the important part!):
--   * Every table has Row Level Security (RLS) enabled.
--   * A user can only read and change rows where user_id = their own id.
--   * A completion stores (habit_id, user_id) and has a composite foreign
--     key to habits(id, user_id). Combined with the RLS rule
--     "user_id must be you", this makes it impossible to record a
--     completion for somebody else's habit — even with hand-crafted API
--     requests that skip the frontend entirely.
-- =====================================================================


-- ---------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------

-- One profile row per auth user. Created automatically by a trigger
-- (see handle_new_user below), so the frontend never has to insert it.
create table if not exists public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  display_name text check (display_name is null or char_length(display_name) <= 60),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table if not exists public.habits (
  id          uuid primary key default gen_random_uuid(),
  -- Defaults to the logged-in user, so the client does not need to send it.
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name        text not null check (char_length(btrim(name)) between 1 and 60),
  description text check (description is null or char_length(description) <= 280),
  category    text not null default 'other' check (
                category in ('health', 'fitness', 'mindfulness', 'learning',
                             'productivity', 'social', 'finance', 'creativity', 'other')
              ),
  -- Free-text daily target, e.g. "20 pages" or "8 glasses". Optional.
  daily_goal  text check (daily_goal is null or char_length(daily_goal) <= 80),
  color       text not null default 'indigo' check (
                color in ('indigo', 'emerald', 'amber', 'rose', 'sky', 'violet', 'teal', 'orange')
              ),
  -- Archived habits keep their history but are hidden from "today".
  is_archived boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  -- Needed so habit_completions can reference (id, user_id) together.
  constraint habits_id_user_id_key unique (id, user_id)
);

create table if not exists public.habit_completions (
  id           uuid primary key default gen_random_uuid(),
  habit_id     uuid not null,
  user_id      uuid not null default auth.uid(),
  -- A calendar date (no time, no timezone). The app sends the user's
  -- LOCAL date, so "today" means today where the user actually is.
  completed_on date not null check (completed_on >= date '2000-01-01'),
  created_at   timestamptz not null default now(),
  -- The completion's owner must be the habit's owner.
  constraint habit_completions_habit_owner_fkey
    foreign key (habit_id, user_id) references public.habits (id, user_id) on delete cascade,
  -- A habit can be completed at most once per day.
  constraint habit_completions_one_per_day unique (habit_id, completed_on)
);


-- ---------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------
-- (The unique constraints above already index habits(id, user_id) and
--  habit_completions(habit_id, completed_on).)

create index if not exists habits_user_id_created_at_idx
  on public.habits (user_id, created_at);

create index if not exists habit_completions_user_id_completed_on_idx
  on public.habit_completions (user_id, completed_on);


-- ---------------------------------------------------------------------
-- Keep updated_at fresh
-- ---------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists habits_set_updated_at on public.habits;
create trigger habits_set_updated_at
  before update on public.habits
  for each row execute function public.set_updated_at();


-- ---------------------------------------------------------------------
-- Create a profile automatically for every new auth user
-- ---------------------------------------------------------------------
-- "security definer" lets the function insert into public.profiles even
-- though regular users have no INSERT permission on that table.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    nullif(left(btrim(coalesce(new.raw_user_meta_data ->> 'display_name', '')), 60), '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

revoke all on function public.handle_new_user() from public, anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill profiles for users who signed up before this script was run.
insert into public.profiles (id)
select id from auth.users
on conflict (id) do nothing;


-- ---------------------------------------------------------------------
-- Table privileges
-- ---------------------------------------------------------------------
-- Logged-out visitors (anon) get nothing. Logged-in users get only the
-- operations the app needs; RLS below then limits WHICH rows they touch.

revoke all on table public.profiles, public.habits, public.habit_completions from anon;
revoke all on table public.profiles, public.habits, public.habit_completions from authenticated;

grant select, update                 on table public.profiles          to authenticated;
grant select, insert, update, delete on table public.habits            to authenticated;
grant select, insert, delete         on table public.habit_completions to authenticated;


-- ---------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------
-- Tip: "(select auth.uid())" instead of "auth.uid()" lets Postgres
-- evaluate the function once per query instead of once per row.

alter table public.profiles          enable row level security;
alter table public.habits            enable row level security;
alter table public.habit_completions enable row level security;

-- profiles ------------------------------------------------------------
drop policy if exists "Users can view their own profile"   on public.profiles;
drop policy if exists "Users can update their own profile" on public.profiles;

create policy "Users can view their own profile"
  on public.profiles for select to authenticated
  using (id = (select auth.uid()));

create policy "Users can update their own profile"
  on public.profiles for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- habits --------------------------------------------------------------
drop policy if exists "Users can view their own habits"   on public.habits;
drop policy if exists "Users can create their own habits" on public.habits;
drop policy if exists "Users can update their own habits" on public.habits;
drop policy if exists "Users can delete their own habits" on public.habits;

create policy "Users can view their own habits"
  on public.habits for select to authenticated
  using (user_id = (select auth.uid()));

create policy "Users can create their own habits"
  on public.habits for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "Users can update their own habits"
  on public.habits for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "Users can delete their own habits"
  on public.habits for delete to authenticated
  using (user_id = (select auth.uid()));

-- habit_completions ---------------------------------------------------
-- There is deliberately no UPDATE policy: a completion is either there
-- or it is not. "Undo" deletes the row.
drop policy if exists "Users can view their own completions"   on public.habit_completions;
drop policy if exists "Users can create their own completions" on public.habit_completions;
drop policy if exists "Users can delete their own completions" on public.habit_completions;

create policy "Users can view their own completions"
  on public.habit_completions for select to authenticated
  using (user_id = (select auth.uid()));

create policy "Users can create their own completions"
  on public.habit_completions for insert to authenticated
  with check (
    user_id = (select auth.uid())
    -- Defence in depth: the habit must also be visible to (owned by) you.
    -- The composite foreign key already guarantees this.
    and exists (
      select 1 from public.habits h
      where h.id = habit_id and h.user_id = (select auth.uid())
    )
    -- No logging the future. One day of slack covers users whose local
    -- date is ahead of the database server's date (timezones).
    and completed_on <= current_date + 1
  );

create policy "Users can delete their own completions"
  on public.habit_completions for delete to authenticated
  using (user_id = (select auth.uid()));
