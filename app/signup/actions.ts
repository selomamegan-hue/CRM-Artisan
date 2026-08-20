'use server'

import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'

export type SignupState = { error?: string; success?: boolean; email?: string } | undefined

async function siteOrigin() {
  const h = await headers()
  const host = h.get('x-forwarded-host') ?? h.get('host')
  const proto = h.get('x-forwarded-proto') ?? 'http'
  return `${proto}://${host}`
}

export async function signup(_prevState: SignupState, formData: FormData) {
  const supabase = await createClient()

  const email = String(formData.get('email') ?? '')
  const password = String(formData.get('password') ?? '')

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: await siteOrigin() },
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
    options: { emailRedirectTo: await siteOrigin() },
  })
  return { error: error?.message }
}
