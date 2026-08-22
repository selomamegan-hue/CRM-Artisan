'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function updateClient(id: string, formData: FormData) {
  const name = String(formData.get('name') ?? '').trim()
  const phone = String(formData.get('phone') ?? '').trim()

  if (!name) return

  const supabase = await createClient()
  await supabase.from('clients').update({ name, phone: phone || null, is_minimal: false }).eq('id', id)
  revalidatePath(`/app/clients/${id}`)
  revalidatePath('/app/clients')
  redirect(`/app/clients/${id}?updated=1`)
}

export async function archiveClient(id: string) {
  const supabase = await createClient()
  await supabase.from('clients').update({ archived_at: new Date().toISOString() }).eq('id', id)
  revalidatePath('/app/clients')
  redirect('/app/clients')
}
