'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { planHasFeature } from '@/lib/plans'
import { getUserPlan } from '@/lib/plans-server'

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
  const amount = Number(formData.get('amount') ?? 0)
  if (!amount || amount <= 0) redirect(`/app/actions/${id}`)

  const plan = await getUserPlan()
  if (!planHasFeature(plan, 'payments')) redirect('/app/choisir-offre')

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: action } = await supabase.from('actions').select('amount_paid').eq('id', id).single()
  if (!action) redirect(`/app/actions/${id}`)

  await supabase.from('payments').insert({ user_id: user.id, action_id: id, amount })
  await supabase
    .from('actions')
    .update({ amount_paid: Number(action.amount_paid) + amount })
    .eq('id', id)

  revalidatePath(`/app/actions/${id}`)
  redirect(`/app/actions/${id}?paid=1`)
}

export async function addDevisItem(id: string, formData: FormData) {
  const description = String(formData.get('description') ?? '').trim()
  const quantity = Number(formData.get('quantity') ?? 1)
  const unitPrice = Number(formData.get('unit_price') ?? 0)
  if (!description || !unitPrice) redirect(`/app/actions/${id}`)

  const plan = await getUserPlan()
  if (!planHasFeature(plan, 'devis_pdf')) redirect('/app/choisir-offre')

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { count } = await supabase
    .from('devis_items')
    .select('id', { count: 'exact', head: true })
    .eq('action_id', id)

  await supabase.from('devis_items').insert({
    user_id: user.id,
    action_id: id,
    description,
    quantity,
    unit_price: unitPrice,
    position: count ?? 0,
  })

  const { data: items } = await supabase.from('devis_items').select('quantity, unit_price').eq('action_id', id)
  const total = (items ?? []).reduce((sum, i) => sum + Number(i.quantity) * Number(i.unit_price), 0)
  await supabase.from('actions').update({ amount: total }).eq('id', id)

  revalidatePath(`/app/actions/${id}`)
  redirect(`/app/actions/${id}`)
}

export async function removeDevisItem(id: string, itemId: string) {
  const plan = await getUserPlan()
  if (!planHasFeature(plan, 'devis_pdf')) redirect('/app/choisir-offre')

  const supabase = await createClient()
  await supabase.from('devis_items').delete().eq('id', itemId)

  const { data: items } = await supabase.from('devis_items').select('quantity, unit_price').eq('action_id', id)
  const total = (items ?? []).reduce((sum, i) => sum + Number(i.quantity) * Number(i.unit_price), 0)
  if (items && items.length > 0) {
    await supabase.from('actions').update({ amount: total }).eq('id', id)
  }

  revalidatePath(`/app/actions/${id}`)
  redirect(`/app/actions/${id}`)
}
