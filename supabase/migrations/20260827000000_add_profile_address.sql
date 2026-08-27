-- Bonfil — adresse de l'entreprise, affichée en en-tête du devis PDF à la
-- place du téléphone. Le WhatsApp reste le moyen de joindre l'artisan ;
-- l'adresse donne au document l'assise d'un papier d'entreprise.
--
-- profiles.phone n'est plus ni saisi ni affiché nulle part après cette
-- migration. La colonne est laissée en place plutôt que supprimée : rien
-- ne l'a jamais écrite, mais on ne détruit pas une colonne pour rien.

alter table profiles add column address text;
