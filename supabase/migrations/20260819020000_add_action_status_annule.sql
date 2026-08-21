-- Une action peut aussi devenir sans objet (ex : le client annule le rendez-vous)
-- sans avoir été faite ni simplement reportée. On la garde (traçabilité dans
-- l'historique) mais elle sort du Fil actif.
alter type action_status add value 'annule';
