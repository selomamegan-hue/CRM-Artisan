-- Bonfil — lignes détaillées d'un devis (quantité, prix unitaire), pour
-- générer un vrai document PDF. Fonctionnalité Gold ("piste V2" de la spec
-- initiale). Une action de type devis sans ligne reste possible : le PDF
-- retombe alors sur excerpt + amount comme ligne unique.

create table devis_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  action_id uuid not null references actions (id) on delete cascade,
  description text not null,
  quantity numeric(10, 2) not null default 1,
  unit_price numeric(10, 2) not null,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create index devis_items_action_id_idx on devis_items (action_id, position);
create index devis_items_user_id_idx on devis_items (user_id);

alter table devis_items enable row level security;

create policy "devis_items: owner" on devis_items
  for all using (auth.uid () = user_id) with check (auth.uid () = user_id);
