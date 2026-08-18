-- KAN-20: Journal-Einträge an den Durchlauf binden.
--
-- Bis hierher trug nur `user_recipe_progress` eine `cycle_number`. Die
-- Journal-Einträge kannten ihren Durchlauf nicht, also fand ein zweiter
-- Durchlauf die Einträge und die Auswertung des ersten wieder vor: das Journal
-- stand sofort auf 7/7, und `saveEvalReflectionAction` hätte die Reflexion des
-- ersten Durchlaufs überschrieben.
--
-- `values_hypothesis` braucht keine eigene Spalte: dort IST `version` die
-- Durchlauf-Nummer. Version N wird in Durchlauf N getestet, und der am Ende von
-- Durchlauf N angepasste Kompass entsteht als Version N+1.
--
-- Re-runnable (`if not exists`), damit ein späterer `db push` sie harmlos
-- wiederholen kann.

alter table journal_entries
  add column if not exists cycle_number integer not null default 1;

comment on column journal_entries.cycle_number is
  'Der Durchlauf des Rezepts, zu dem der Eintrag gehört — zählt parallel zu user_recipe_progress.cycle_number. Bestand vor KAN-20 ist Durchlauf 1.';

-- Die Werte-Reads filtern durchweg auf (user, recipe_slug, template_type,
-- cycle_number); der Bestandsindex deckt nur (user_id, created_at).
create index if not exists idx_journal_entries_user_recipe_cycle
  on journal_entries (user_id, recipe_slug, template_type, cycle_number);
