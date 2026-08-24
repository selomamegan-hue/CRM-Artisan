-- Bonfil — corrige accept_invite() : elle plantait avec une erreur Postgres
-- brute (violation de contrainte unique) quand la personne qui accepte est
-- déjà un compte secondaire actif ailleurs, au lieu de le signaler
-- proprement. Retourne maintenant un statut texte que l'application peut
-- afficher clairement : 'ok' | 'invalid' | 'already_active'.

-- Le type de retour change (boolean -> text) : create or replace ne peut
-- pas faire ça seul, il faut d'abord supprimer l'ancienne fonction.
drop function if exists accept_invite (uuid);

create function accept_invite (token uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  matched_id uuid;
begin
  -- Vérifié explicitement en amont pour un message clair dans le cas
  -- courant ; le "exception when unique_violation" plus bas reste le
  -- filet de sécurité si deux acceptations se chevauchent.
  if exists (
    select 1 from delegates
    where secondary_user_id = auth.uid ()
      and status = 'active'
  ) then
    return 'already_active';
  end if;

  select id into matched_id
  from delegates
  where invite_token = token
    and status = 'pending'
    and invite_expires_at > now()
  limit 1;

  if matched_id is null then
    return 'invalid';
  end if;

  update delegates
  set secondary_user_id = auth.uid (),
      status = 'active',
      accepted_at = now()
  where id = matched_id;

  return 'ok';
exception
  when unique_violation then
    return 'already_active';
end;
$$;

grant execute on function accept_invite (uuid) to authenticated;
