'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export type CreateClientState = { error?: string } | undefined

export async function createNewClient(_prevState: CreateClientState, formData: FormData) {
  const name = String(formData.get('name') ?? '').trim()
  const phone = String(formData.get('phone') ?? '').trim()

  if (!name) return { error: 'Le nom est obligatoire.' }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data, error } = await supabase
    .from('clients')
    .insert({ user_id: user!.id, name, phone: phone || null, is_minimal: false })
    .select('id')
    .single()

  if (error) return { error: error.message }

  redirect(`/app/clients/${data.id}`)
}
