'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { ActionType } from '@/lib/types'

export async function confirmNote(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const transcript = String(formData.get('transcript') ?? '').trim()
  const source = String(formData.get('source') ?? 'manual') === 'voice' ? 'voice' : 'manual'
  const site = String(formData.get('site') ?? '').trim()
  const clientId = String(formData.get('client_id') ?? '')
  const newClientName = String(formData.get('new_client_name') ?? '').trim()
  const type = String(formData.get('type') ?? 'autre') as ActionType
  const dueDateRaw = String(formData.get('due_date') ?? '').trim()
  const amountRaw = String(formData.get('amount') ?? '').trim()
  const excerpt = String(formData.get('excerpt') ?? '').trim()

  if (!transcript || !excerpt) redirect('/app/record')

  let finalClientId = clientId

  if (!finalClientId) {
    if (!newClientName) redirect('/app/record')
    const { data: newClient, error } = await supabase
      .from('clients')
      .insert({ user_id: user.id, name: newClientName, is_minimal: true })
      .select('id')
      .single()
    if (error || !newClient) redirect('/app/record')
    finalClientId = newClient.id
  }

  const { data: note, error: noteError } = await supabase
    .from('notes')
    .insert({
      user_id: user.id,
      client_id: finalClientId,
      transcript,
      site: site || null,
      source,
      status: 'confirmee',
    })
    .select('id')
    .single()

  if (noteError || !note) redirect('/app/record')

  await supabase.from('actions').insert({
    user_id: user.id,
    client_id: finalClientId,
    note_id: note.id,
    type,
    due_date: dueDateRaw || null,
    amount: amountRaw ? Number(amountRaw) : null,
    excerpt,
  })

  redirect('/app')
}
