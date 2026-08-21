-- Bonfil — feedback libre envoyé par l'artisan depuis Profil.
-- Pas d'interface d'administration pour l'instant : consultation directe
-- depuis le dashboard Supabase.

create table feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  message text not null,
  created_at timestamptz not null default now()
);

create index feedback_user_id_idx on feedback (user_id, created_at desc);

alter table feedback enable row level security;

create policy "feedback: owner" on feedback
  for all using (auth.uid () = user_id) with check (auth.uid () = user_id);
