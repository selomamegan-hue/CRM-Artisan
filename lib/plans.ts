export type Plan = 'essai' | 'pro' | 'premium' | 'gold'

export const PLAN_LABEL: Record<Plan, string> = {
  essai: 'Essai gratuit',
  pro: 'Pro',
  premium: 'Premium',
  gold: 'Gold',
}

export const PLAN_ORDER: Plan[] = ['pro', 'premium', 'gold']

export type Feature = 'payments' | 'chantier' | 'dashboard' | 'custom_signature'

const PLAN_FEATURES: Record<Plan, Feature[]> = {
  essai: ['payments', 'chantier', 'dashboard', 'custom_signature'],
  pro: [],
  premium: ['payments', 'chantier'],
  gold: ['payments', 'chantier', 'dashboard', 'custom_signature'],
}

export function planHasFeature(plan: Plan, feature: Feature): boolean {
  return PLAN_FEATURES[plan].includes(feature)
}

// Notes issues de la transcription IA — coûtent un appel OpenAI, donc
// plafonnées sur l'offre Pro. null = illimité.
const VOICE_NOTE_MONTHLY_LIMIT: Partial<Record<Plan, number>> = {
  pro: 30,
}

export function voiceNoteMonthlyLimit(plan: Plan): number | null {
  return VOICE_NOTE_MONTHLY_LIMIT[plan] ?? null
}
