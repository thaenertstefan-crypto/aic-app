-- KAN-43 — Das tägliche Mantra-Ritual im Confidence-Boost ist verworfen.
--
-- Damit ist das Mantra kein Nutzer-Datum mehr, sondern Inhalt der Übung: es
-- steht als Konstante in app/(app)/booster/confidence/confidence-booster.tsx.
-- Die beiden Tabellen, die das Ritual editierbar gemacht haben, fallen weg.
--
-- Re-runnable (drop … if exists), damit ein späterer `db push` sie harmlos
-- erneut ausführen kann. RLS-Policies und Indizes fallen mit der Tabelle.
--
-- Die `cleanser_checkins`-Zeilen mit dem Slug "mantra" bleiben stehen: sie
-- sind Historie, kosten nichts und werden von niemandem mehr gelesen.

drop table if exists public.mantra_cards;
drop table if exists public.user_mantra;
