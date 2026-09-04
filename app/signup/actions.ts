'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { authCallbackUrl } from '@/lib/site-origin'
import { normaliserCode } from '@/lib/parrainage'

export type SignupState = { error?: string; success?: boolean; email?: string } | undefined

export async function signup(_prevState: SignupState, formData: FormData) {
  const supabase = await createClient()

  const email = String(formData.get('email') ?? '')
  const password = String(formData.get('password') ?? '')
  const code = normaliserCode(String(formData.get('code_parrainage') ?? ''))

  // Un code faux se dit tout de suite : l'artisan l'a recopié d'un message
  // WhatsApp, il peut le corriger. Le laisser passer en silence priverait
  // le partenaire de sa commission sans que personne ne s'en aperçoive.
  if (code) {
    const { data: ouvert } = await supabase.rpc('code_parrainage_ouvert', { p_code: code })
    if (!ouvert) {
      return { error: 'Ce code de parrainage n’est pas valable. Vérifie-le, ou laisse le champ vide.' }
    }
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: await authCallbackUrl('/app'),
      // Le rattachement est décidé par le déclencheur en base, qui revérifie
      // le code : une métadonnée forgée ne rapporte rien.
      data: code ? { code_parrainage: code } : undefined,
    },
  })

  if (error) {
    return { error: error.message }
  }

  if (data.session) {
    redirect('/app')
  }

  // Supabase returns a user with no identities (and sends no new e-mail)
  // when the address already has a confirmed account.
  if (data.user && data.user.identities?.length === 0) {
    return { error: 'Un compte existe déjà avec cette adresse. Connecte-toi plutôt.' }
  }

  return { success: true, email }
}

export async function resendConfirmation(email: string) {
  const supabase = await createClient()
  const { error } = await supabase.auth.resend({
    type: 'signup',
    email,
    options: { emailRedirectTo: await authCallbackUrl('/app') },
  })
  return { error: error?.message }
}
