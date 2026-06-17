-- Cleanser-Einleitungen: merkt pro User & Cleanser-Slug, ob die "Worum geht's?"-
-- Intro schon gesehen wurde. Erster Besuch (keine Zeile) => Intro aufgeklappt,
-- danach eingeklappt. Status getrennt pro cleanser_slug.
--
-- Bisher gab es keine per-Cleanser-State-Tabelle (nur cleanser_checkins für die
-- täglichen Check-ins).

create table if not exists public.cleanser_intro_seen (
  user_id       uuid not null references auth.users (id) on delete cascade,
  cleanser_slug text not null,
  seen_at       timestamptz not null default now(),
  primary key (user_id, cleanser_slug)
);

alter table public.cleanser_intro_seen enable row level security;

create policy "Users can read own cleanser intro state"
  on public.cleanser_intro_seen for select
  using (auth.uid() = user_id);

create policy "Users can insert own cleanser intro state"
  on public.cleanser_intro_seen for insert
  with check (auth.uid() = user_id);

create policy "Users can update own cleanser intro state"
  on public.cleanser_intro_seen for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
