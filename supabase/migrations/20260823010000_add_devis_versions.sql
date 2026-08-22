-- Bonfil — versionnement des devis. Un devis envoyé devient en lecture
-- seule (status = 'envoye') ; toute modification ultérieure crée une
-- nouvelle version avec un nouveau numéro, plutôt que d'altérer ce qui a
-- déjà été montré au client. Corrige le risque de solde qui varie sous
-- les pieds d'un acompte déjà encaissé.

create table devis_versions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  action_id uuid not null references actions (id) on delete cascade,
  number text not null,
  status text not null default 'brouillon', -- 'brouillon' | 'envoye'
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  unique (user_id, number)
);

create index devis_versions_action_id_idx on devis_versions (action_id, created_at desc);
create index devis_versions_user_id_idx on devis_versions (user_id);

alter table devis_versions enable row level security;

create policy "devis_versions: owner" on devis_versions
  for all using (auth.uid () = user_id) with check (auth.uid () = user_id);

alter table devis_items add column version_id uuid references devis_versions (id) on delete cascade;
