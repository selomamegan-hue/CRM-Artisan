-- Bonfil — programme partenaires : codes de parrainage.
--
-- Les codes sont remis à la main : Selom reçoit un message, décide, génère
-- un code au nom du partenaire. Aucune inscription automatique de partenaire
-- — c'est le filtre le plus efficace au démarrage.
--
-- Deux compteurs distincts, à ne pas confondre :
--   • le CODE vaut 12 mois et se révoque — il décide qui peut encore amener
--     des artisans ;
--   • la COMMISSION court 12 mois PAR ARTISAN, depuis son premier mois payé
--     — elle décide ce qui est dû.
-- La révocation ferme le premier sans toucher au second : un bouton capable
-- d'annuler une dette suffirait à faire fuir les bons partenaires.

create table partner_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  partner_name text not null,
  partner_whatsapp text,
  note text,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz
);

create index partner_codes_code_idx on partner_codes (code);

-- Rattachement définitif de l'artisan au code qui l'a amené. Jamais modifié
-- ensuite : « un artisan appartient au premier partenaire qui l'a amené ».
alter table profiles add column referred_by uuid references partner_codes (id) on delete set null;

-- Bonfil n'encaisse pas les abonnements dans l'application (Mobile Money,
-- à la main). Cette date est donc saisie par l'administrateur : c'est elle
-- qui ouvre la fenêtre de commission de douze mois.
alter table profiles add column first_paid_at timestamptz;

alter table profiles add column is_admin boolean not null default false;

create index profiles_referred_by_idx on profiles (referred_by);

alter table partner_codes enable row level security;

-- Personne n'accède à la table en direct hors administration. Les artisans
-- passent par les fonctions ci-dessous, qui ne révèlent rien du barème ni
-- des autres partenaires.
create policy "partner_codes: admin" on partner_codes for all using (
  exists (
    select 1 from profiles p where p.id = auth.uid () and p.is_admin
  )
)
with
  check (
    exists (
      select 1 from profiles p where p.id = auth.uid () and p.is_admin
    )
  );

-- ---------------------------------------------------------------------
-- Inscription
-- ---------------------------------------------------------------------

-- Vérifie qu'un code peut encore amener des artisans. Renvoie un booléen et
-- rien d'autre : un visiteur ne doit pas pouvoir moissonner les noms des
-- partenaires en essayant des codes.
create or replace function code_parrainage_ouvert (p_code text)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from partner_codes
    where code = upper(btrim(p_code))
      and revoked_at is null
      and expires_at > now()
  );
$$;

revoke all on function code_parrainage_ouvert (text) from public;
grant execute on function code_parrainage_ouvert (text) to anon, authenticated;

-- Le rattachement est décidé ICI, pas par le client : le code voyage dans
-- les métadonnées d'inscription, mais seul un code réellement ouvert produit
-- un rattachement. Une métadonnée forgée ne rapporte rien à personne.
create or replace function handle_new_user ()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_code uuid;
begin
  select id into v_code
  from partner_codes
  where code = upper(btrim(new.raw_user_meta_data ->> 'code_parrainage'))
    and revoked_at is null
    and expires_at > now();

  insert into public.profiles (id, full_name, subscription_plan, subscription_expires_at, referred_by)
  values (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    'essai',
    now() + interval '15 days',
    v_code
  );
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- Administration
-- ---------------------------------------------------------------------

create or replace function est_admin ()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce((select is_admin from profiles where id = auth.uid ()), false);
$$;

revoke all on function est_admin () from public;
grant execute on function est_admin () to authenticated;

-- Le tableau du programme. Passe par une fonction plutôt que par une
-- politique élargie : l'administrateur voit le nom et l'offre de ses
-- filleuls, jamais leurs clients ni leurs chantiers.
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
  first_paid_at timestamptz
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
    p.id, p.full_name, p.subscription_plan::text, p.created_at, p.first_paid_at
  from partner_codes c
  left join profiles p on p.referred_by = c.id
  order by c.created_at desc, p.created_at asc;
end;
$$;

revoke all on function parrainage_tableau () from public;
grant execute on function parrainage_tableau () to authenticated;

-- Marque (ou efface) le premier mois payé d'un filleul. C'est le seul champ
-- qu'un administrateur touche sur le profil d'un autre — rien d'autre n'est
-- ouvert par cette fonction.
create or replace function parrainage_premier_paiement (p_artisan uuid, p_date timestamptz)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not est_admin () then
    raise exception 'not_admin';
  end if;

  update profiles set first_paid_at = p_date where id = p_artisan;
end;
$$;

revoke all on function parrainage_premier_paiement (uuid, timestamptz) from public;
grant execute on function parrainage_premier_paiement (uuid, timestamptz) to authenticated;
