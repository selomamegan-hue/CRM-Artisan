'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export type UpdatePasswordState = { error?: string } | undefined

export async function updatePassword(_prevState: UpdatePasswordState, formData: FormData) {
  const supabase = await createClient()
  const password = String(formData.get('password') ?? '')

  const { error } = await supabase.auth.updateUser({ password })
  if (error) return { error: error.message }

  redirect('/app')
}
