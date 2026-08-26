'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { authCallbackUrl } from '@/lib/site-origin'

export type AcceptInviteState = { error?: string; success?: boolean; email?: string } | undefined

const FRIENDLY_ERROR: Record<string, string> = {
  already_active: 'Ce compte est déjà secondaire sur un autre atelier Bonfil. Demande à en être retiré avant d’accepter cette invitation, ou déconnecte-toi pour en créer un nouveau.',
  invalid: "Cette invitation n'est plus valide.",
}

function friendlyLinkError(status: string | null | undefined): string {
  return FRIENDLY_ERROR[status ?? 'invalid'] ?? FRIENDLY_ERROR.invalid
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
    options: { emailRedirectTo: await authCallbackUrl(`/invite/${token}/confirm`) },
  })

  if (error) return { error: error.message }

  if (data.user && data.user.identities?.length === 0) {
    return { error: "Un compte existe déjà avec cette adresse. Connecte-toi, puis reviens sur ce même lien d'invitation pour l'accepter." }
  }

  if (data.session) {
    const { data: status } = await supabase.rpc('accept_invite', { token })
    if (status !== 'ok') return { error: friendlyLinkError(status) }
    redirect('/app')
  }

  return { success: true, email }
}

// Utilisée quand la personne qui clique le lien est déjà connectée à un
// compte Bonfil existant — pas besoin de créer un nouveau compte, on lie
// directement la session en cours. Utilisée comme action de formulaire
// brute (sans useActionState) : le résultat se lit dans l'URL, jamais
// dans une valeur de retour qui serait silencieusement ignorée.
export async function acceptInviteLoggedIn(token: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect(`/invite/${token}`)

  const { data: status } = await supabase.rpc('accept_invite', { token })
  if (status !== 'ok') redirect(`/invite/${token}?error=${status ?? 'invalid'}`)
  redirect('/app')
}
