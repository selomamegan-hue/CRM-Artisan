-- Bonfil — suivi acompte / solde sur les actions facturables (devis, facture)
-- amount = montant total ; amount_paid = ce qui a déjà été encaissé (acompte).
-- Le solde restant se calcule côté appli : amount - amount_paid.

alter table actions add column amount_paid numeric(10, 2) not null default 0;
