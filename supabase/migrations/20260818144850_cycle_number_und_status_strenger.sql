-- KAN-23 — Durchlauf- und Status-Spalten strenger machen.
--
-- Der Code normalisiert diese drei Spalten heute an rund zehn Stellen von Hand
-- (`?? 1`, `status === "completed"` gegen einen freien String). Ab hier sagt die
-- Datenbank selbst, was der Code ohnehin annimmt.
--
-- Die Backfill-UPDATEs sind ein Sicherheitsnetz: der Produktionsstand wurde vor
-- dieser Migration geprüft (2026-08-18) — keine NULLs, keine Fremdwerte. Sie
-- treffen null Zeilen und stehen hier für den Fall, dass ein anderer Stand
-- (lokal, Branch, Wiederherstellung) es anders sieht.
--
-- Die Datei ist re-runnable geschrieben (der `create type` steckt in einem
-- Guard). Der Dateiname trägt bewusst die Version, unter der die Migration auf
-- Prod bereits verbucht ist (20260818144850) — ein späterer `db push` sieht sie
-- damit als angewandt und nicht als ausstehend.

-- ── 1. Durchlauf-Nummern ───────────────────────────────────────────────
-- `values_hypothesis.version` ist die Durchlauf-Nummer der Werte-Übung und
-- bekommt bewusst keine eigene `cycle_number` — siehe ADR-0003.

update user_recipe_progress set cycle_number = 1 where cycle_number is null;
alter table user_recipe_progress alter column cycle_number set default 1;
alter table user_recipe_progress alter column cycle_number set not null;

update values_hypothesis set version = 1 where version is null;
alter table values_hypothesis alter column version set default 1;
alter table values_hypothesis alter column version set not null;

-- ── 2. status als Enum ─────────────────────────────────────────────────
-- Enum statt CHECK-Constraint: ein CHECK ließe `status: string` im generierten
-- Typ stehen, die Union müsste von Hand gepflegt werden und könnte von der
-- Datenbank abdriften. Ein Enum wird von `supabase gen types` selbst zur Union
-- — damit werden die 73 String-Literale im Code geprüft, ohne dass eine
-- einzige Stelle angefasst wird.

do $$
begin
  if not exists (select 1 from pg_type where typname = 'recipe_status') then
    create type recipe_status as enum ('not_started', 'in_progress', 'completed');
  end if;
end $$;

update user_recipe_progress set status = 'not_started' where status is null;

alter table user_recipe_progress alter column status drop default;
alter table user_recipe_progress
  alter column status type recipe_status using status::recipe_status;
alter table user_recipe_progress alter column status set default 'not_started';
alter table user_recipe_progress alter column status set not null;
