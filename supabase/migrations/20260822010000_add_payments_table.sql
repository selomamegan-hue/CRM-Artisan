-- Bonfil — historique des paiements (un acompte, un solde = une ligne).
-- actions.amount_paid reste un total mis à jour à chaque insertion ici,
-- pour garder les lectures simples (Le Fil, fiche client) sans agrégation.

create table payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  action_id uuid not null references actions (id) on delete cascade,
  amount numeric(10, 2) not null,
  created_at timestamptz not null default now()
);

create index payments_action_id_idx on payments (action_id, created_at desc);
create index payments_user_id_idx on payments (user_id);

alter table payments enable row level security;

create policy "payments: owner" on payments
  for all using (auth.uid () = user_id) with check (auth.uid () = user_id);
