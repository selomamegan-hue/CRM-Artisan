-- Bonfil — encaisser un mois d'abonnement depuis l'écran de parrainage.
--
-- Poser une offre sans toucher à l'échéance enfermerait l'artisan dehors :
-- le proxy renvoie vers /app/choisir-offre dès que subscription_expires_at
-- est dépassée. Les trois écritures vont donc ensemble, dans une seule
-- fonction, plutôt que d'être laissées à la discipline de l'appelant.

drop function if exists parrainage_tableau ();

create or replace function parrainage_tableau ()
returns table (
  code_id uuid,
  code text,
  partner_name text,
  partner_whatsapp text,
  note text,
  expires_at timestamptz,
  revoked_at timestamptz,
  artisan_id uuid,
  artisan_nom text,
  artisan_plan text,
  inscrit_le timestamptz,
  first_paid_at timestamptz,
  abonnement_jusqu_au timestamptz
)
language plpgsql
security definer
set search_path = public
stable
as $$
begin
  if not est_admin () then
    raise exception 'not_admin';
  end if;

  return query
  select
    c.id, c.code, c.partner_name, c.partner_whatsapp, c.note,
    c.expires_at, c.revoked_at,
    p.id, p.full_name, p.subscription_plan::text, p.created_at, p.first_paid_at,
    p.subscription_expires_at
  from partner_codes c
  left join profiles p on p.referred_by = c.id
  order by c.created_at desc, p.created_at asc;
end;
$$;

revoke all on function parrainage_tableau () from public;
grant execute on function parrainage_tableau () to authenticated;

-- Un mois encaissé, en un seul geste :
--   • l'offre payante remplace l'essai ;
--   • le premier paiement ouvre la fenêtre de commission — et seulement le
--     premier : les mois suivants ne la repoussent pas (coalesce) ;
--   • l'échéance avance d'un mois depuis la plus tardive entre l'échéance
--     courante et la date encaissée, pour qu'un paiement anticipé ne fasse
--     pas perdre les jours restants.
create or replace function parrainage_encaisser (p_artisan uuid, p_plan text, p_date timestamptz)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not est_admin () then
    raise exception 'not_admin';
  end if;

  if p_plan not in ('pro', 'premium', 'gold') then
    raise exception 'offre_invalide';
  end if;

  update profiles
  set
    subscription_plan = p_plan::subscription_plan_type,
    first_paid_at = coalesce(first_paid_at, p_date),
    subscription_expires_at = greatest(coalesce(subscription_expires_at, p_date), p_date) + interval '1 month'
  where id = p_artisan;
end;
$$;

revoke all on function parrainage_encaisser (uuid, text, timestamptz) from public;
grant execute on function parrainage_encaisser (uuid, text, timestamptz) to authenticated;

-- parrainage_premier_paiement reste en place : elle ne pose que la date, et
-- sert encore à corriger une saisie sans toucher à l'offre ni à l'échéance.
