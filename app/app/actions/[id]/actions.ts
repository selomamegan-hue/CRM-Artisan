'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function markDone(id: string) {
  const supabase = await createClient()
  await supabase
    .from('actions')
    .update({ status: 'fait', completed_at: new Date().toISOString() })
    .eq('id', id)
  revalidatePath('/app')
  redirect('/app')
}

export async function cancelAction(id: string) {
  const supabase = await createClient()
  await supabase.from('actions').update({ status: 'annule' }).eq('id', id)
  revalidatePath('/app')
  redirect('/app')
}

export async function postpone(id: string, formData: FormData) {
  const dueDate = String(formData.get('due_date') ?? '')
  if (!dueDate) redirect(`/app/actions/${id}`)

  const supabase = await createClient()
  await supabase.from('actions').update({ due_date: dueDate }).eq('id', id)
  revalidatePath('/app')
  redirect('/app')
}

export async function recordPayment(id: string, formData: FormData) {
  const amountPaid = Number(formData.get('amount_paid') ?? 0)

  const supabase = await createClient()
  await supabase.from('actions').update({ amount_paid: amountPaid }).eq('id', id)
  revalidatePath(`/app/actions/${id}`)
  redirect(`/app/actions/${id}`)
}
