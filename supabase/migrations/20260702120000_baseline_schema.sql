-- ============================================================================
-- Baseline-Migration: kompletter Ist-Zustand des Remote-Schemas (2026-07-02).
--
-- Per SQL-Introspection aus dem Live-Projekt gezogen (pg_catalog/pg_policies),
-- da `supabase db pull` lokal Docker benötigt. Ersetzt die früheren Dateien
-- 0001 (intro_seen) und 0002 (cleanser_intro_seen) — deren Änderungen sind
-- hier enthalten; die Remote-Migrations-Historie wurde per `migration repair`
-- auf diese Baseline gesetzt.
--
-- Bewusst NICHT enthalten (Plattform-verwaltet von Supabase):
--   - Extensions (pg_graphql, pgcrypto, …) und die Standard-Grants für
--     anon/authenticated/service_role (kommen über Default Privileges)
--   - Die Event-Trigger-Funktion public.rls_auto_enable() (auto-RLS für neue
--     Tabellen; braucht Superuser und existiert auf jedem Supabase-Projekt)
--
-- Künftige Schema-Änderungen: `npx supabase migration new <name>` + SQL +
-- `npx supabase db push` — nicht mehr direkt im Dashboard klicken.
-- ============================================================================

-- ─── Funktion + Trigger: Profil bei Signup anlegen ──────────────────────────

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path to ''
as $$
begin
  insert into public.profiles (id, name)
  values (new.id, new.raw_user_meta_data->>'name');
  return new;
end;
$$;

-- ─── Tabellen (in FK-Abhängigkeitsreihenfolge) ───────────────────────────────

create table if not exists public.profiles (
  id                   uuid primary key references auth.users (id) on delete cascade,
  name                 text,
  onboarding_completed boolean default false,
  confidence_baseline  integer,
  active_recipe_id     text,
  created_at           timestamptz default now()
);

create table if not exists public.ai_usage_log (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  endpoint   text not null,
  created_at timestamptz default now()
);

create table if not exists public.bill_of_rights (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references public.profiles (id) on delete cascade,
  rights     jsonb not null default '[]'::jsonb,
  updated_at timestamptz default now(),
  created_at timestamptz default now()
);

create table if not exists public.cleanser_checkins (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles (id),
  cleanser_slug text not null,
  date          date not null default current_date,
  created_at    timestamptz default now(),
  unique (user_id, cleanser_slug, date)
);

create table if not exists public.cleanser_intro_seen (
  user_id       uuid not null references auth.users (id) on delete cascade,
  cleanser_slug text not null,
  seen_at       timestamptz not null default now(),
  primary key (user_id, cleanser_slug)
);

create table if not exists public.daily_checkins (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references public.profiles (id) on delete cascade,
  date       date default current_date,
  mood_score integer,
  notes      text,
  active_recipe_slug text,
  constraint daily_checkins_user_date_unique unique (user_id, date)
);

create table if not exists public.journal_entries (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references public.profiles (id) on delete cascade,
  recipe_slug   text,
  template_type text not null,
  entry_date    date default current_date,
  content       jsonb not null,
  ai_insights   text,
  created_at    timestamptz default now()
);

create table if not exists public.mantra_cards (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  thought    text not null,
  reframe    text not null,
  sort_order integer not null default 0,
  created_at timestamptz default now()
);

create table if not exists public.promises (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid references public.profiles (id) on delete cascade,
  description    text not null,
  start_date     date default current_date,
  target_days    integer default 30,
  current_streak integer default 0,
  longest_streak integer default 0,
  last_completed date,
  active         boolean default true,
  created_at     timestamptz default now()
);

create table if not exists public.promise_completions (
  id             uuid primary key default gen_random_uuid(),
  promise_id     uuid references public.promises (id) on delete cascade,
  completed_date date default current_date,
  unique (promise_id, completed_date)
);

create table if not exists public.user_mantra (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null unique references auth.users (id) on delete cascade,
  text       text not null,
  updated_at timestamptz default now()
);

create table if not exists public.user_recipe_progress (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references public.profiles (id) on delete cascade,
  recipe_slug  text not null,
  current_step integer default 1,
  status       text default 'not_started',
  started_at   timestamptz,
  completed_at timestamptz,
  cycle_number integer default 1,
  intro_seen   boolean not null default false,
  unique (user_id, recipe_slug, cycle_number)
);

create table if not exists public.values_hypothesis (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references public.profiles (id) on delete cascade,
  values     jsonb not null,
  version    integer default 1,
  confirmed  boolean default false,
  created_at timestamptz default now()
);

-- ─── Indizes (zusätzlich zu PK-/Unique-Indizes) ──────────────────────────────

create index if not exists ai_usage_log_user_endpoint_created_idx
  on public.ai_usage_log (user_id, endpoint, created_at desc);

create index if not exists idx_bill_of_rights_user_id
  on public.bill_of_rights (user_id);

create index if not exists idx_journal_entries_user_created
  on public.journal_entries (user_id, created_at desc);

create index if not exists mantra_cards_user_id_sort_idx
  on public.mantra_cards (user_id, sort_order);

create index if not exists idx_promises_user
  on public.promises (user_id);

create index if not exists idx_values_hypothesis_user_version
  on public.values_hypothesis (user_id, version desc);

-- ─── Row Level Security ──────────────────────────────────────────────────────
-- Policies nutzen `(select auth.uid())` statt `auth.uid()` direkt: Postgres
-- wertet das Subselect einmal pro Statement aus (InitPlan) statt pro Zeile.

alter table public.profiles             enable row level security;
alter table public.ai_usage_log         enable row level security;
alter table public.bill_of_rights       enable row level security;
alter table public.cleanser_checkins    enable row level security;
alter table public.cleanser_intro_seen  enable row level security;
alter table public.daily_checkins       enable row level security;
alter table public.journal_entries      enable row level security;
alter table public.mantra_cards         enable row level security;
alter table public.promises             enable row level security;
alter table public.promise_completions  enable row level security;
alter table public.user_mantra          enable row level security;
alter table public.user_recipe_progress enable row level security;
alter table public.values_hypothesis    enable row level security;

create policy "Users can view own profile"
  on public.profiles for select
  using ((select auth.uid()) = id);

create policy "Users can insert own profile"
  on public.profiles for insert
  with check ((select auth.uid()) = id);

create policy "Users can update own profile"
  on public.profiles for update
  using ((select auth.uid()) = id);

create policy "Users can view own ai usage"
  on public.ai_usage_log for select
  using ((select auth.uid()) = user_id);

create policy "Users can insert own ai usage"
  on public.ai_usage_log for insert
  with check ((select auth.uid()) = user_id);

create policy "Users manage own bill of rights"
  on public.bill_of_rights for all
  using ((select auth.uid()) = user_id);

create policy "Users can manage own cleanser checkins"
  on public.cleanser_checkins for all
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can read own cleanser intro state"
  on public.cleanser_intro_seen for select
  using ((select auth.uid()) = user_id);

create policy "Users can insert own cleanser intro state"
  on public.cleanser_intro_seen for insert
  with check ((select auth.uid()) = user_id);

create policy "Users can update own cleanser intro state"
  on public.cleanser_intro_seen for update
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can manage own checkins"
  on public.daily_checkins for all
  using ((select auth.uid()) = user_id);

create policy "Users manage own journal entries"
  on public.journal_entries for all
  using ((select auth.uid()) = user_id);

create policy "Users manage own mantra cards"
  on public.mantra_cards for all
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users manage own promises"
  on public.promises for all
  using ((select auth.uid()) = user_id);

create policy "Users manage own promise completions"
  on public.promise_completions for all
  using (promise_id in (
    select promises.id from public.promises
    where promises.user_id = (select auth.uid())
  ));

create policy "Users manage own mantra"
  on public.user_mantra for all
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users manage own recipe progress"
  on public.user_recipe_progress for all
  using ((select auth.uid()) = user_id);

create policy "Users manage own values"
  on public.values_hypothesis for all
  using ((select auth.uid()) = user_id);

-- ─── Trigger: Profil bei Signup anlegen ──────────────────────────────────────

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
