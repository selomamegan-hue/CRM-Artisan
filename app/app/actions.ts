'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}

export async function submitFeedback(formData: FormData) {
  const message = String(formData.get('message') ?? '').trim()
  if (!message) redirect('/app/settings')

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  await supabase.from('feedback').insert({ user_id: user.id, message })
  redirect('/app/settings?feedback=sent')
}
