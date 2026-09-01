import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'

/* Ce qui reste dû à l'artisan — une seule définition, partagée.
 *
 * Un devis ne devient une créance que le jour où le client l'accepte. Tant
 * qu'il n'a pas dit oui, le relancer relève de la vente, pas du
 * recouvrement : l'afficher comme « à récupérer » envoie l'artisan réclamer
 * un argent qu'on ne lui doit pas encore.
 *
 * Trois écrans montrent ce chiffre — la bande sur Clients, la vue Impayés et
 * le tableau de bord. Ils divergeaient parce que chacun portait sa propre
 * règle ; elle vit désormais ici, et nulle part ailleurs.
 */

export type DevisVersionResume = { validated_at: string | null; created_at: string }

export type ActionEncours = {
  id: string
  type: string
  excerpt: string
  amount: number
  amount_paid: number
  due_date: string | null
  clients: { name: string; phone: string | null } | null
  devis_versions: DevisVersionResume[] | null
}

/* Seule la dernière version compte : modifier un devis déjà accepté en ouvre
   une nouvelle, que le client n'a pas encore vue — donc pas encore acceptée. */
export function devisAccepte(versions: DevisVersionResume[] | null | undefined): boolean {
  const v = versions ?? []
  if (v.length === 0) return false
  const derniere = v.reduce((recente, x) => (x.created_at > recente.created_at ? x : recente))
  return derniere.validated_at != null
}

export function estDu(a: {
  type: string
  amount: number | null
  amount_paid: number | null
  devis_versions?: DevisVersionResume[] | null
}): boolean {
  if (a.amount == null) return false
  if (a.amount <= (a.amount_paid ?? 0)) return false
  return a.type === 'devis' ? devisAccepte(a.devis_versions) : true
}

const COLONNES =
  'id, type, excerpt, amount, amount_paid, due_date, clients(name, phone), devis_versions(validated_at, created_at)'

export async function fetchEncours(supabase: SupabaseClient): Promise<ActionEncours[]> {
  const { data } = await supabase
    .from('actions')
    .select(COLONNES)
    .not('amount', 'is', null)
    .neq('status', 'annule')
    .returns<ActionEncours[]>()

  return (data ?? []).filter(estDu)
}

/* Ligne par ligne, jamais en global : un trop-perçu sur un chantier ne doit
   pas venir effacer ce qu'un autre client doit encore. */
export function totalEncours(rows: { amount: number; amount_paid: number }[]): number {
  return rows.reduce((somme, a) => somme + Math.max(0, a.amount - a.amount_paid), 0)
}
