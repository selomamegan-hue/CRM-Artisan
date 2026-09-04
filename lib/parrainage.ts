import type { Plan } from '@/lib/plans'
import { PLAN_PRICE } from '@/lib/plans'

/* Le barème du programme partenaires, à un seul endroit : la page publique
   qui le promet et l'écran qui le calcule lisent les mêmes nombres. */

export const TAUX_COMMISSION = 10 // % de l'abonnement encaissé
export const DUREE_COMMISSION_MOIS = 12 // par artisan, à partir de son 1er mois payé
export const DUREE_CODE_MOIS = 12 // validité d'un code de parrainage

/* Le compteur court PAR ARTISAN, pas par code : un partenaire qui amène
   quelqu'un la veille de l'expiration de son code touche autant que le
   premier jour. Sinon il cesserait de recruter bien avant son terme. */
export function finDeCommission(premierPaiement: Date): Date {
  const fin = new Date(premierPaiement)
  fin.setMonth(fin.getMonth() + DUREE_COMMISSION_MOIS)
  return fin
}

export function commissionMensuelle(plan: Plan): number {
  return Math.round((PLAN_PRICE[plan] * TAUX_COMMISSION) / 100)
}

/* Un code non révoqué et non expiré peut encore amener des artisans. La
   révocation ne touche jamais les commissions déjà ouvertes — voir la règle
   affichée sur /partenaire. */
export function codeOuvert(code: { expires_at: string; revoked_at: string | null }, maintenant = new Date()): boolean {
  return code.revoked_at == null && new Date(code.expires_at) > maintenant
}

export function etatDuCode(
  code: { expires_at: string; revoked_at: string | null },
  maintenant = new Date()
): { libelle: string; ton: 'ouvert' | 'clos' } {
  if (code.revoked_at) return { libelle: 'Révoqué', ton: 'clos' }
  if (new Date(code.expires_at) <= maintenant) return { libelle: 'Expiré', ton: 'clos' }
  return { libelle: 'Actif', ton: 'ouvert' }
}

/* Caractères sans ambiguïté à l'oral ni à l'écrit : ni O/0, ni I/1, ni S/5.
   Un code se dicte au téléphone et se recopie sur un chantier. */
const ALPHABET = 'ABCDEFGHJKLMNPQRTUVWXYZ2346789'

export function nouveauCode(longueur = 6): string {
  let sortie = ''
  for (let i = 0; i < longueur; i++) {
    sortie += ALPHABET[Math.floor(Math.random() * ALPHABET.length)]
  }
  return sortie
}

export function normaliserCode(saisi: string): string {
  return saisi.trim().toUpperCase().replace(/\s+/g, '')
}
