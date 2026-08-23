'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { planHasFeature } from '@/lib/plans'
import { getUserPlan } from '@/lib/plans-server'
import { getOrCreateDraftVersion, recomputeActionAmount } from '@/lib/devis-versions'

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

export async function markDevisValidated(id: string) {
  const plan = await getUserPlan()
  if (!planHasFeature(plan, 'devis_stamps')) redirect('/app/choisir-offre')

  const supabase = await createClient()

  // Ne s'applique qu'à la version déjà envoyée — un brouillon n'a encore
  // rien à valider, et une future modification créera de toute façon une
  // nouvelle version qui repart sans validation.
  const { data: version } = await supabase
    .from('devis_versions')
    .select('id, status')
    .eq('action_id', id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (version && version.status === 'envoye') {
    await supabase.from('devis_versions').update({ validated_at: new Date().toISOString() }).eq('id', version.id)
  }

  revalidatePath(`/app/actions/${id}`)
  redirect(`/app/actions/${id}`)
}

export async function addDevisItem(id: string, formData: FormData) {
  const description = String(formData.get('description') ?? '').trim()
  const quantity = Number(formData.get('quantity') ?? 1)
  const unitPrice = Number(formData.get('unit_price') ?? 0)
  // Quantité toujours réelle (>0) ; le prix peut être à 0 pour une ligne offerte.
  if (!description || !(quantity > 0) || unitPrice < 0) redirect(`/app/actions/${id}`)

  const plan = await getUserPlan()
  if (!planHasFeature(plan, 'devis_pdf')) redirect('/app/choisir-offre')

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const versionId = await getOrCreateDraftVersion(supabase, user.id, id)

  const { count } = await supabase
    .from('devis_items')
    .select('id', { count: 'exact', head: true })
    .eq('version_id', versionId)

  await supabase.from('devis_items').insert({
    user_id: user.id,
    action_id: id,
    version_id: versionId,
    description,
    quantity,
    unit_price: unitPrice,
    position: count ?? 0,
  })

  await recomputeActionAmount(supabase, id, versionId)

  revalidatePath(`/app/actions/${id}`)
  redirect(`/app/actions/${id}`)
}

export async function removeDevisItem(id: string, itemId: string) {
  const plan = await getUserPlan()
  if (!planHasFeature(plan, 'devis_pdf')) redirect('/app/choisir-offre')

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: item } = await supabase.from('devis_items').select('version_id').eq('id', itemId).single()
  if (!item) redirect(`/app/actions/${id}`)

  // Si l'item vit sur une version déjà envoyée (lecture seule), on clone
  // d'abord vers un brouillon et on retire la ligne là — jamais sur l'original.
  const { data: version } = await supabase.from('devis_versions').select('status').eq('id', item.version_id).single()
  const versionId =
    version?.status === 'envoye' ? await getOrCreateDraftVersion(supabase, user.id, id) : item.version_id

  if (version?.status === 'envoye') {
    // Le clone a copié toutes les lignes de la version envoyée, y compris
    // celle qu'on veut retirer : on la retrouve par sa description/prix sur
    // le nouveau brouillon plutôt que par son ancien id.
    const { data: original } = await supabase
      .from('devis_items')
      .select('description, quantity, unit_price')
      .eq('id', itemId)
      .single()
    if (original) {
      await supabase
        .from('devis_items')
        .delete()
        .eq('version_id', versionId)
        .eq('description', original.description)
        .eq('quantity', original.quantity)
        .eq('unit_price', original.unit_price)
    }
  } else {
    await supabase.from('devis_items').delete().eq('id', itemId)
  }

  await recomputeActionAmount(supabase, id, versionId)

  revalidatePath(`/app/actions/${id}`)
  redirect(`/app/actions/${id}`)
}
