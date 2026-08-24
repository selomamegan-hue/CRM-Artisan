'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { findBestClientMatch } from '@/lib/client-match'
import { resolveOwnerId } from '@/lib/delegates'

export type CreateClientState =
  | { error?: string; duplicate?: { id: string; name: string } }
  | undefined

export async function createNewClient(_prevState: CreateClientState, formData: FormData) {
  const name = String(formData.get('name') ?? '').trim()
  const phone = String(formData.get('phone') ?? '').trim()
  const confirmDuplicate = formData.get('confirm_duplicate') === 'true'

  if (!name) return { error: 'Le nom est obligatoire.' }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!confirmDuplicate) {
    const { data: existing } = await supabase
      .from('clients')
      .select('id, name')
      .is('archived_at', null)
      .order('name')

    const match = findBestClientMatch(name, existing ?? [])
    if (match) return { duplicate: { id: match.id, name: match.name } }
  }

  const ownerId = await resolveOwnerId(supabase, user!.id)
  const { data, error } = await supabase
    .from('clients')
    .insert({ user_id: ownerId, name, phone: phone || null, is_minimal: false })
    .select('id')
    .single()

  if (error) return { error: error.message }

  redirect(`/app/clients/${data.id}`)
}
