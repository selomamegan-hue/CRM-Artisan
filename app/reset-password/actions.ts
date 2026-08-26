'use server'

import { createClient } from '@/lib/supabase/server'
import { authCallbackUrl } from '@/lib/site-origin'

export type RequestResetState = { error?: string; success?: boolean } | undefined

export async function requestPasswordReset(_prevState: RequestResetState, formData: FormData) {
  const supabase = await createClient()
  const email = String(formData.get('email') ?? '')

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: await authCallbackUrl('/reset-password/confirm'),
  })

  if (error) return { error: error.message }
  return { success: true }
}
