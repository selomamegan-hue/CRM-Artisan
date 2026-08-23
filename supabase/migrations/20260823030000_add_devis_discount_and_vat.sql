-- Bonfil — remise (montant fixe FCFA) et TVA sur les devis, pour les
-- artisans assujettis qui facturent des clients formels. Total = (somme
-- des lignes - remise) x (1 + taux TVA / 100). vat_rate reste vide quand
-- le devis n'y est pas assujetti.

alter table profiles add column vat_registered boolean not null default false;

alter table devis_versions add column discount_amount numeric(10, 2) not null default 0;
alter table devis_versions add column vat_rate numeric(5, 2);
