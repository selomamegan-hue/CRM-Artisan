import 'server-only'
import { createClient } from '@/lib/supabase/server'
import type { Plan } from '@/lib/plans'

export async function getUserPlan(): Promise<Plan> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return 'essai'

  const { data } = await supabase.from('profiles').select('subscription_plan').eq('id', user.id).single()
  return (data?.subscription_plan as Plan | undefined) ?? 'essai'
}
