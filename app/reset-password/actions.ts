'use server'

import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'

export type RequestResetState = { error?: string; success?: boolean } | undefined

async function siteOrigin() {
  const h = await headers()
  const host = h.get('x-forwarded-host') ?? h.get('host')
  const proto = h.get('x-forwarded-proto') ?? 'http'
  return `${proto}://${host}`
}

export async function requestPasswordReset(_prevState: RequestResetState, formData: FormData) {
  const supabase = await createClient()
  const email = String(formData.get('email') ?? '')

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${await siteOrigin()}/reset-password/confirm`,
  })

  if (error) return { error: error.message }
  return { success: true }
}
