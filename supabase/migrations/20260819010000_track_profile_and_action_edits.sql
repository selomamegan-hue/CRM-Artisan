-- Audit V1 : Profil/Paramètres et Fiche client deviennent éditables.
-- profiles et actions n'avaient pas encore de updated_at (clients et notes l'ont déjà).

alter table profiles add column updated_at timestamptz not null default now();
alter table actions add column updated_at timestamptz not null default now();

create trigger profiles_set_updated_at before update on profiles
  for each row execute function set_updated_at ();

create trigger actions_set_updated_at before update on actions
  for each row execute function set_updated_at ();
