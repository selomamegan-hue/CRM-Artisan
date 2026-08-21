export type SubscriptionStatus = 'actif' | 'bientot' | 'expire' | 'inconnu'

export function subscriptionStatus(expiresAt: string | null, today: Date): SubscriptionStatus {
  if (!expiresAt) return 'inconnu'
  const diffMs = new Date(expiresAt).getTime() - today.getTime()
  const daysLeft = Math.ceil(diffMs / 86_400_000)
  if (daysLeft < 0) return 'expire'
  if (daysLeft <= 7) return 'bientot'
  return 'actif'
}

export function subscriptionLabel(expiresAt: string | null, today: Date): string {
  if (!expiresAt) return 'Abonnement non renseigné'
  const diffMs = new Date(expiresAt).getTime() - today.getTime()
  const daysLeft = Math.ceil(diffMs / 86_400_000)
  if (daysLeft < 0) {
    const n = Math.abs(daysLeft)
    return `Expiré depuis ${n} jour${n > 1 ? 's' : ''}`
  }
  if (daysLeft === 0) return "Expire aujourd'hui"
  if (daysLeft <= 7) return `Expire dans ${daysLeft} jour${daysLeft > 1 ? 's' : ''}`
  return `Actif — ${daysLeft} jours restants`
}

export const SUBSCRIPTION_STYLE: Record<SubscriptionStatus, string> = {
  actif: 'bg-[#3A9188]/[0.13] text-[#3A9188]',
  bientot: 'bg-[#D97B4F]/[0.14] text-[#C96A3D]',
  expire: 'bg-[#D97B4F] text-white',
  inconnu: 'bg-[#22303A]/[0.08] text-[#8B9298]',
}

export const SUBSCRIPTION_DOT: Record<SubscriptionStatus, string> = {
  actif: 'bg-[#3A9188]',
  bientot: 'bg-[#D97B4F]',
  expire: 'bg-white',
  inconnu: 'bg-[#8B9298]',
}
