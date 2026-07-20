-- cleanser_checkins.user_id war die einzige User-FK ohne ON DELETE CASCADE
-- (baseline_schema.sql:63 referenziert profiles(id) mit NO ACTION). Angleich an
-- alle Schwester-Tabellen (wants, journal_entries, …), damit das Loeschen eines
-- Users kaskadiert statt am FK zu scheitern. Voraussetzung fuer ein spaeteres
-- DSGVO-Konto-Loeschen. Siehe Memory supabase-delete-test-user-fk.

alter table public.cleanser_checkins
  drop constraint if exists cleanser_checkins_user_id_fkey;

alter table public.cleanser_checkins
  add constraint cleanser_checkins_user_id_fkey
  foreign key (user_id) references public.profiles (id) on delete cascade;
