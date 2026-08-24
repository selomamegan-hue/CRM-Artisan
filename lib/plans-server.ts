import 'server-only'
import { createClient } from '@/lib/supabase/server'
import { resolveOwnerId } from '@/lib/delegates'
import type { Plan } from '@/lib/plans'

// Un compte secondaire n'a pas son propre abonnement : il hérite du plan du
// compte principal qui l'a invité, sinon il verrait toujours son propre
// profil 'essai' auto-créé à l'inscription plutôt que le vrai plan payant.
export async function getUserPlan(): Promise<Plan> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return 'essai'

  const ownerId = await resolveOwnerId(supabase, user.id)
  const { data } = await supabase.from('profiles').select('subscription_plan').eq('id', ownerId).single()
  return (data?.subscription_plan as Plan | undefined) ?? 'essai'
}
