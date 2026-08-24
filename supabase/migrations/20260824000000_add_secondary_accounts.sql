-- Bonfil — comptes secondaires (Premium : 1, Gold : 3).
--
-- Un compte secondaire est un vrai utilisateur Supabase Auth, mais n'a pas
-- son propre abonnement : il agit pour le compte du principal qui l'a
-- invité, avec accès à toutes les données de travail (clients, notes,
-- actions, paiements, devis) sauf l'abonnement et la facturation, qui
-- restent réservés au principal.
--
-- Processus d'invitation : le principal génère un lien à usage unique
-- (jeton aléatoire, expire sous 7 jours) ; le secondaire choisit lui-même
-- son mot de passe en l'acceptant — le principal ne le connaît jamais.

create table delegates (
  id uuid primary key default gen_random_uuid(),
  primary_user_id uuid not null references profiles (id) on delete cascade,
  secondary_user_id uuid references auth.users (id) on delete cascade,
  invite_token uuid not null default gen_random_uuid(),
  invite_expires_at timestamptz not null default (now() + interval '7 days'),
  status text not null default 'pending', -- 'pending' | 'active' | 'revoked'
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  revoked_at timestamptz
);

-- Un compte secondaire n'est actif que pour un seul principal à la fois.
create unique index delegates_active_secondary_idx on delegates (secondary_user_id)
  where status = 'active';

-- Un jeton d'invitation en attente doit être unique pour être résolu sans ambiguïté.
create unique index delegates_pending_token_idx on delegates (invite_token)
  where status = 'pending';

create index delegates_primary_user_id_idx on delegates (primary_user_id);

alter table delegates enable row level security;

-- Le principal gère ses propres invitations (créer, révoquer, consulter).
create policy "delegates: primary manages" on delegates
  for all using (auth.uid () = primary_user_id) with check (auth.uid () = primary_user_id);

-- Le secondaire peut voir sa propre ligne (savoir qui l'a invité, son statut).
create policy "delegates: secondary reads own" on delegates
  for select using (auth.uid () = secondary_user_id);

-- ---------------------------------------------------------------------
-- has_org_access — vrai si l'utilisateur connecté est le propriétaire
-- direct de target_user_id, ou un de ses comptes secondaires actifs.
-- Centralise la règle dans une seule fonction plutôt que de la dupliquer
-- dans chaque politique, pour qu'il n'y ait qu'un seul endroit à auditer.
-- ---------------------------------------------------------------------

create function has_org_access (target_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select auth.uid () = target_user_id
    or exists (
      select 1 from delegates
      where primary_user_id = target_user_id
        and secondary_user_id = auth.uid ()
        and status = 'active'
    );
$$;

-- ---------------------------------------------------------------------
-- Accès délégué — une politique additionnelle par table. Les politiques
-- RLS de même commande se combinent avec OR : celles déjà en place restent
-- inchangées, celle-ci ajoute seulement l'accès des comptes secondaires
-- actifs, sans toucher au comportement existant pour le compte principal.
-- ---------------------------------------------------------------------

create policy "profiles: delegate reads" on profiles
  for select using (has_org_access (id));

create policy "clients: delegate access" on clients
  for all using (has_org_access (user_id)) with check (has_org_access (user_id));

create policy "notes: delegate access" on notes
  for all using (has_org_access (user_id)) with check (has_org_access (user_id));

create policy "actions: delegate access" on actions
  for all using (has_org_access (user_id)) with check (has_org_access (user_id));

create policy "payments: delegate access" on payments
  for all using (has_org_access (user_id)) with check (has_org_access (user_id));

create policy "devis_items: delegate access" on devis_items
  for all using (has_org_access (user_id)) with check (has_org_access (user_id));

create policy "devis_versions: delegate access" on devis_versions
  for all using (has_org_access (user_id)) with check (has_org_access (user_id));

-- ---------------------------------------------------------------------
-- Acceptation d'invitation — deux fonctions "security definer" pour que
-- la page publique /invite/[token] puisse résoudre un jeton (avant même
-- que le visiteur ait un compte) et l'activer (juste après sa création),
-- sans avoir à ouvrir la table "delegates" en lecture publique — ce qui
-- permettrait à n'importe qui d'énumérer les invitations en attente.
-- ---------------------------------------------------------------------

create function validate_invite_token (token uuid)
returns table (primary_name text)
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(p.full_name, 'Un artisan Bonfil')
  from delegates d
  join profiles p on p.id = d.primary_user_id
  where d.invite_token = token
    and d.status = 'pending'
    and d.invite_expires_at > now();
$$;

grant execute on function validate_invite_token (uuid) to anon, authenticated;

-- Ne fait rien d'autre que lier le compte qui vient de se créer (auth.uid())
-- à l'invitation désignée par le jeton — jamais appelable pour un autre
-- compte que celui qui l'exécute.
create function accept_invite (token uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  matched_id uuid;
begin
  select id into matched_id
  from delegates
  where invite_token = token
    and status = 'pending'
    and invite_expires_at > now()
  limit 1;

  if matched_id is null then
    return false;
  end if;

  update delegates
  set secondary_user_id = auth.uid (),
      status = 'active',
      accepted_at = now()
  where id = matched_id;

  return true;
end;
$$;

grant execute on function accept_invite (uuid) to authenticated;
