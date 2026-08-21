-- Champ de suivi de l'abonnement payant. Pas encore de facturation
-- automatisée : réglé manuellement pour l'instant, prendra la valeur
-- du webhook de paiement le jour où un vrai fournisseur sera branché.
-- Volontairement non modifiable depuis l'app elle-même (pas d'auto-extension).
alter table profiles add column subscription_expires_at timestamptz;
