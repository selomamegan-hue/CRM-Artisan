-- Bonfil — lien public d'un devis envoyé.
--
-- L'artisan partage son devis sur WhatsApp : le client n'a pas de compte
-- Bonfil et ne doit surtout pas en créer un pour lire un PDF. On lui donne
-- donc une adresse porteuse d'un jeton long et imprévisible (24 octets
-- aléatoires, 48 caractères hexadécimaux) plutôt que l'identifiant du devis,
-- qui reste protégé par RLS.

alter table devis_versions add column public_token text unique;

-- Seule voie de lecture anonyme. `security definer` contourne RLS de façon
-- volontairement étroite : uniquement par jeton exact, uniquement sur une
-- version déjà envoyée (un brouillon n'a jamais été montré au client), et
-- uniquement les champs qui figurent de toute façon sur le PDF.
create or replace function devis_public (p_token text)
returns jsonb
language sql
security definer
set search_path = public
stable
as $$
  select jsonb_build_object(
    'number', v.number,
    'validated', v.validated_at is not null,
    'discount_amount', coalesce(v.discount_amount, 0),
    'vat_rate', v.vat_rate,
    'plan', p.subscription_plan::text,
    'company_name', p.full_name,
    'company_address', p.address,
    'company_whatsapp', p.whatsapp,
    'logo_url', p.logo_url,
    'client_name', c.name,
    'client_phone', c.phone,
    'excerpt', a.excerpt,
    'amount', a.amount,
    'amount_paid', a.amount_paid,
    'created_at', a.created_at,
    'items', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'description', i.description,
          'quantity', i.quantity,
          'unit_price', i.unit_price
        ) order by i.position
      )
      from devis_items i
      where i.version_id = v.id
    ), '[]'::jsonb)
  )
  from devis_versions v
  join actions a on a.id = v.action_id
  join profiles p on p.id = v.user_id
  left join clients c on c.id = a.client_id
  where v.public_token = p_token
    and v.status = 'envoye';
$$;

revoke all on function devis_public (text) from public;
grant execute on function devis_public (text) to anon, authenticated;
