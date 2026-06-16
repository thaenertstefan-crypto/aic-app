-- Schritt 6.10: Rezept-Einleitungen (Hybrid-Intro)
--
-- Merkt pro Rezept, ob der User die durchklickbare Intro-Sequenz schon gesehen
-- hat. Danach wird statt der Sequenz nur noch der eingeklappte
-- "Worum geht's?"-Collapsible gezeigt.
--
-- Semantik: intro_seen gilt pro recipe_slug (nicht pro cycle_number) — gesehen,
-- sobald IRGENDEINE Zeile dieses Slugs intro_seen = true hat. Gesetzt wird das
-- Flag auf der Zeile mit der höchsten cycle_number.
--
-- DEFAULT false versorgt bestehende Zeilen automatisch (kein separates UPDATE).

ALTER TABLE user_recipe_progress
  ADD COLUMN intro_seen BOOLEAN NOT NULL DEFAULT false;
