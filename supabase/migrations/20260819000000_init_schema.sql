-- Bonfil — schéma initial
-- 4 tables : profiles, clients, notes, actions.
-- "Correction" (spec section 2, écran 8) n'est pas une table séparée : c'est
-- une simple édition de notes/actions existantes, tracée par updated_at.

create extension if not exists pg_trgm; -- recherche floue du nom cité dans une transcription

-- ---------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------

create type note_status as enum ('a_relire', 'confirmee', 'corrigee');
create type action_type as enum ('devis', 'rappel', 'facture', 'autre');
create type action_status as enum ('a_faire', 'fait', 'reporte');

-- ---------------------------------------------------------------------
-- profiles — l'artisan (1 par compte). Étend auth.users.
-- ---------------------------------------------------------------------

create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  phone text,
  whatsapp text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- clients — fiche minimale, peut être créée en silence (spec 2.2, cas limite)
-- ---------------------------------------------------------------------

create table clients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  name text not null,
  phone text,
  is_minimal boolean not null default false, -- true tant que Marc n'a pas complété la fiche
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index clients_user_id_idx on clients (user_id);
create index clients_name_trgm_idx on clients using gin (name gin_trgm_ops);

-- ---------------------------------------------------------------------
-- notes — une note vocale, rattachée à un client (spec 2.1, 2.2)
-- ---------------------------------------------------------------------

create table notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  client_id uuid not null references clients (id) on delete cascade,
  audio_url text,
  incoming_phone text, -- numéro entrant si l'appel a été capté
  transcript text not null,
  status note_status not null default 'a_relire',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index notes_client_id_idx on notes (client_id, created_at desc); -- Écran 6, Historique
create index notes_user_id_idx on notes (user_id);

-- ---------------------------------------------------------------------
-- actions — l'action détectée dans une note (spec 2.3, 2.6)
-- ---------------------------------------------------------------------

create table actions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  client_id uuid not null references clients (id) on delete cascade,
  note_id uuid not null references notes (id) on delete cascade,
  type action_type not null,
  status action_status not null default 'a_faire',
  due_date date,
  amount numeric(10, 2), -- montant à facturer, si mentionné
  excerpt text not null, -- extrait de la note, affiché dans Le Fil
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index actions_fil_idx on actions (user_id, status, due_date); -- Écran 3, Le Fil
create index actions_client_id_idx on actions (client_id);

-- ---------------------------------------------------------------------
-- updated_at automatique sur édition (trace une correction manuelle)
-- ---------------------------------------------------------------------

create function set_updated_at ()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger clients_set_updated_at before update on clients
  for each row execute function set_updated_at ();

create trigger notes_set_updated_at before update on notes
  for each row execute function set_updated_at ();

-- ---------------------------------------------------------------------
-- profil créé automatiquement à l'inscription (aucun formulaire, spec 1)
-- ---------------------------------------------------------------------

create function handle_new_user ()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data ->> 'full_name');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user ();

-- ---------------------------------------------------------------------
-- Row Level Security — chaque artisan ne voit que ses propres données
-- ---------------------------------------------------------------------

alter table profiles enable row level security;
alter table clients enable row level security;
alter table notes enable row level security;
alter table actions enable row level security;

create policy "profiles: self" on profiles
  for all using (auth.uid () = id) with check (auth.uid () = id);

create policy "clients: owner" on clients
  for all using (auth.uid () = user_id) with check (auth.uid () = user_id);

create policy "notes: owner" on notes
  for all using (auth.uid () = user_id) with check (auth.uid () = user_id);

create policy "actions: owner" on actions
  for all using (auth.uid () = user_id) with check (auth.uid () = user_id);
