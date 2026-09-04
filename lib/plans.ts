export type Plan = 'essai' | 'pro' | 'premium' | 'gold'

export const PLAN_LABEL: Record<Plan, string> = {
  essai: 'Essai gratuit',
  pro: 'Pro',
  premium: 'Premium',
  gold: 'Gold',
}

export const PLAN_ORDER: Plan[] = ['pro', 'premium', 'gold']

// Tarif mensuel en FCFA. Sert au calcul des commissions de parrainage ;
// les prix affichés sur la page d'accueil doivent suivre.
export const PLAN_PRICE: Record<Plan, number> = {
  essai: 0,
  pro: 3000,
  premium: 3500,
  gold: 5000,
}

export type Feature =
  | 'payments'
  | 'chantier'
  | 'dashboard'
  | 'custom_signature'
  | 'devis_pdf'
  | 'devis_logo'
  | 'devis_stamps'
  | 'secondary_accounts'

const PLAN_FEATURES: Record<Plan, Feature[]> = {
  essai: ['payments', 'chantier', 'dashboard', 'custom_signature', 'devis_pdf', 'devis_logo', 'devis_stamps', 'secondary_accounts'],
  pro: [],
  premium: ['payments', 'chantier', 'devis_pdf', 'devis_logo', 'secondary_accounts'],
  gold: ['payments', 'chantier', 'dashboard', 'custom_signature', 'devis_pdf', 'devis_logo', 'devis_stamps', 'secondary_accounts'],
}

export function planHasFeature(plan: Plan, feature: Feature): boolean {
  return PLAN_FEATURES[plan].includes(feature)
}

// Notes issues de la transcription IA. Le plafond ne protège plus un coût —
// le fournisseur actuel ne facture rien — mais les limites de débit de son
// palier gratuit, et il garde à Premium son argument : l'illimité. À 100,
// un artisan seul ne le rencontre jamais ; un atelier qui dicte toute la
// journée, si. null = illimité.
const VOICE_NOTE_MONTHLY_LIMIT: Partial<Record<Plan, number>> = {
  pro: 100,
}

export function voiceNoteMonthlyLimit(plan: Plan): number | null {
  return VOICE_NOTE_MONTHLY_LIMIT[plan] ?? null
}

// Devis PDF envoyés — Premium a un avant-goût plafonné, Gold est illimité.
const DEVIS_MONTHLY_LIMIT: Partial<Record<Plan, number>> = {
  premium: 5,
}

export function devisMonthlyLimit(plan: Plan): number | null {
  return DEVIS_MONTHLY_LIMIT[plan] ?? null
}

// Comptes secondaires actifs — Premium : 1, Gold : 3. Illimité pendant
// l'essai, comme les autres quotas, pour que l'artisan voie toute la valeur
// avant de payer.
const SECONDARY_ACCOUNT_LIMIT: Partial<Record<Plan, number>> = {
  premium: 1,
  gold: 3,
}

export function secondaryAccountLimit(plan: Plan): number | null {
  return SECONDARY_ACCOUNT_LIMIT[plan] ?? null
}
