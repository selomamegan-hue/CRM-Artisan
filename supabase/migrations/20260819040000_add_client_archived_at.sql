-- "Supprimer un client" effacerait aussi ses notes/actions en cascade (FK on
-- delete cascade) — on archive plutôt : la fiche et l'historique restent
-- intacts, le client sort juste de la liste active.
alter table clients add column archived_at timestamptz;
