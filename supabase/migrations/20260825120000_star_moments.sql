-- Momente: ein Beleg an einem Stern — „das hier habe ich gelebt".
--
-- `star_id` hat bewusst KEINEN Fremdschlüssel. Ein Stern ist kein Datensatz:
-- `wants` hat genau eine Zeile je Nutzer, die Sterne stehen darin als
-- JSONB-Array. Eine Stern-ID ist ein vom Client erzeugter String innerhalb
-- dieses Arrays — darauf kann Postgres nichts referenzieren. Waisen sind
-- deshalb erlaubt und werden nur best-effort geräumt; siehe
-- docs/adr/0007-momente-in-eigener-tabelle-ohne-fremdschluessel.md.
--
-- Re-runnable geschrieben (`if not exists`, `drop policy if exists`), damit
-- sie ohne Docker angewandt werden kann und ein späterer `db push` sie
-- harmlos wiederholt.

create table if not exists public.star_moments (
  -- Kein Default: die id kommt vom Client. Stern und Moment entstehen im
  -- selben Schreibvorgang, aber in zwei Anweisungen — weil beide Seiten ihre
  -- id mitbringen, ist jede Wiederholung nach einem Teilfehler idempotent.
  id         uuid primary key,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  star_id    text not null,
  -- 800 wie ein Antwortfeld der Übung (ANSWER_MAX), nicht die 300 aus
  -- TEXT_MAX_SHORT: ein übernommener Moment trägt ein ganzes Antwortfeld.
  -- Der Backstop hinter der warmen Meldung aus `momentTextError`.
  text       text not null check (char_length(text) <= 800),
  -- Intern, nie sichtbar: die Oberfläche erkennt daran, ob an einem Stern
  -- noch kein eigener Moment hängt.
  origin     text not null check (origin in ('audit', 'own')),
  created_at timestamptz not null default now()
);

-- Die einzige Abfrageform, die je vorkommt: „die Momente dieses Sterns".
create index if not exists idx_star_moments_user_star
  on public.star_moments (user_id, star_id, created_at);

alter table public.star_moments enable row level security;

drop policy if exists "Users manage own star moments" on public.star_moments;
create policy "Users manage own star moments"
  on public.star_moments for all
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
