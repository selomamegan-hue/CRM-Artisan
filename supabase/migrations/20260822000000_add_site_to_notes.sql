-- Bonfil — chantier (libellé libre) associé à une note, pour distinguer
-- plusieurs chantiers chez un même client. Saisi à la main par Marc,
-- jamais déduit par l'IA.

alter table notes add column site text;
