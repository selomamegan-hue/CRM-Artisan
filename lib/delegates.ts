import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'

// Un compte secondaire n'a pas son propre abonnement : toute donnée qu'il
// lit ou écrit doit être rattachée au compte principal qui l'a invité, pas
// à son propre id Supabase Auth. Ce helper est le point de passage unique
// entre "qui est connecté" et "à qui appartiennent les données" — chaque
// action serveur qui lit ou écrit clients/notes/actions/paiements/devis
// doit résoudre l'id propriétaire avec cette fonction avant toute requête.
export async function resolveOwnerId(supabase: SupabaseClient, userId: string): Promise<string> {
  const { data } = await supabase
    .from('delegates')
    .select('primary_user_id')
    .eq('secondary_user_id', userId)
    .eq('status', 'active')
    .maybeSingle()
  return data?.primary_user_id ?? userId
}

// L'abonnement, la facturation, le logo, la TVA et la gestion des comptes
// secondaires eux-mêmes restent réservés au compte principal — ce helper
// sert à masquer ces sections plutôt qu'à router les données.
export async function isActiveDelegate(supabase: SupabaseClient, userId: string): Promise<boolean> {
  const { data } = await supabase
    .from('delegates')
    .select('id')
    .eq('secondary_user_id', userId)
    .eq('status', 'active')
    .maybeSingle()
  return data != null
}

export async function countActiveDelegates(supabase: SupabaseClient, primaryUserId: string): Promise<number> {
  const { count } = await supabase
    .from('delegates')
    .select('id', { count: 'exact', head: true })
    .eq('primary_user_id', primaryUserId)
    .eq('status', 'active')
  return count ?? 0
}
