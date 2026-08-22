'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}

export async function updateProfileName(formData: FormData) {
  const fullName = String(formData.get('full_name') ?? '').trim()

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  await supabase.from('profiles').update({ full_name: fullName || null }).eq('id', user.id)
  redirect('/app/settings?name_updated=1')
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
