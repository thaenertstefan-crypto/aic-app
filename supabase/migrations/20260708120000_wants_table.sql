-- Wants-Rezept: eine Zeile pro User, Wants + Little Bets als JSONB-Arrays
-- (Muster bill_of_rights; unique(user_id) schützt das Select-then-Insert
-- der kanonischen Save-Action vor Doppel-Zeilen-Races).

create table if not exists public.wants (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references public.profiles (id) on delete cascade,
  wants      jsonb not null default '[]'::jsonb,
  bets       jsonb not null default '[]'::jsonb,
  updated_at timestamptz default now(),
  created_at timestamptz default now(),
  unique (user_id)
);

create index if not exists idx_wants_user_id on public.wants (user_id);

alter table public.wants enable row level security;

create policy "Users manage own wants"
  on public.wants for all
  using ((select auth.uid()) = user_id);
