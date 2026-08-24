'use server'

import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'

export type AcceptInviteState = { error?: string; success?: boolean; email?: string } | undefined

async function siteOrigin() {
  const h = await headers()
  const host = h.get('x-forwarded-host') ?? h.get('host')
  const proto = h.get('x-forwarded-proto') ?? 'http'
  return `${proto}://${host}`
}

export async function acceptInvite(token: string, _prevState: AcceptInviteState, formData: FormData): Promise<AcceptInviteState> {
  const supabase = await createClient()

  // Un jeton expiré ou déjà utilisé ne doit jamais laisser créer un compte
  // orphelin — on revalide côté serveur avant de toucher à auth.signUp.
  const { data: check } = await supabase.rpc('validate_invite_token', { token })
  if (!check?.[0]) return { error: "Cette invitation n'est plus valide." }

  const email = String(formData.get('email') ?? '')
  const password = String(formData.get('password') ?? '')

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: `${await siteOrigin()}/invite/${token}/confirm` },
  })

  if (error) return { error: error.message }

  if (data.user && data.user.identities?.length === 0) {
    return { error: "Un compte existe déjà avec cette adresse. Connecte-toi, puis redemande un lien d'invitation." }
  }

  if (data.session) {
    const { data: linked } = await supabase.rpc('accept_invite', { token })
    if (!linked) return { error: "Cette invitation n'est plus valide." }
    redirect('/app')
  }

  return { success: true, email }
}
