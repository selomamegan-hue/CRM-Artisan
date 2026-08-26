'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { siteOrigin } from '@/lib/site-origin'
import { getUserPlan } from '@/lib/plans-server'
import { planHasFeature, secondaryAccountLimit } from '@/lib/plans'
import { isActiveDelegate } from '@/lib/delegates'

// Seul le compte principal peut inviter — un compte secondaire ne doit
// jamais pouvoir en inviter un autre en son propre nom.
export async function inviteSecondaryAccount() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  if (await isActiveDelegate(supabase, user.id)) redirect('/app/settings')

  const plan = await getUserPlan()
  if (!planHasFeature(plan, 'secondary_accounts')) redirect('/app/choisir-offre')

  const limit = secondaryAccountLimit(plan)
  if (limit != null) {
    const { count } = await supabase
      .from('delegates')
      .select('id', { count: 'exact', head: true })
      .eq('primary_user_id', user.id)
      .in('status', ['pending', 'active'])
    if ((count ?? 0) >= limit) redirect('/app/settings?delegate_error=quota')
  }

  const { data: invite, error } = await supabase
    .from('delegates')
    .insert({ primary_user_id: user.id })
    .select('invite_token')
    .single()
  if (error || !invite) redirect('/app/settings?delegate_error=create')

  redirect(`/app/settings?invite_token=${invite.invite_token}`)
}

// RLS ("delegates: primary manages") garantit déjà qu'on ne peut révoquer
// que ses propres invitations — cette vérification applicative est une
// deuxième ligne de défense, pas la seule.
export async function revokeSecondaryAccount(delegateId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  await supabase
    .from('delegates')
    .update({ status: 'revoked', revoked_at: new Date().toISOString() })
    .eq('id', delegateId)
    .eq('primary_user_id', user.id)

  redirect('/app/settings?delegate_revoked=1')
}

export async function inviteLink(token: string): Promise<string> {
  return `${await siteOrigin()}/invite/${token}`
}
