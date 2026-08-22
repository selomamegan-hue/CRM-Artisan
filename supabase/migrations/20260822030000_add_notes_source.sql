-- Bonfil — distingue une note issue de la transcription IA (consomme le
-- quota de notes vocales de l'offre Pro) d'une note saisie à la main
-- (gratuite, illimitée sur toutes les offres).

alter table notes add column source text not null default 'manual';
