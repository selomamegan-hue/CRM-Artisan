-- Bonfil — logo d'entreprise (Premium/Gold) et validation client (Gold) sur
-- les devis PDF. validated_at vit sur devis_versions, jamais sur actions :
-- une nouvelle version (après modification d'un devis déjà envoyé) repart
-- toujours sans tampon "Validé", puisque le client n'a pas vu ces termes-là.

alter table profiles add column logo_url text;
alter table devis_versions add column validated_at timestamptz;

-- Bucket public : un logo n'est pas une donnée sensible, il est destiné à
-- être vu par les clients sur le document. Seul le propriétaire peut
-- écrire dans son propre dossier (préfixe {user_id}/).
insert into storage.buckets (id, name, public)
values ('logos', 'logos', true)
on conflict (id) do nothing;

create policy "logos: owner can upload"
  on storage.objects for insert
  with check (bucket_id = 'logos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "logos: owner can update"
  on storage.objects for update
  using (bucket_id = 'logos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "logos: owner can delete"
  on storage.objects for delete
  using (bucket_id = 'logos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "logos: public read"
  on storage.objects for select
  using (bucket_id = 'logos');
