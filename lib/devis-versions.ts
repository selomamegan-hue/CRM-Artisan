import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'

async function nextDevisNumber(supabase: SupabaseClient, userId: string): Promise<string> {
  const { count } = await supabase
    .from('devis_versions')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
  const n = (count ?? 0) + 1
  return `D-${String(n).padStart(3, '0')}`
}

// A devis in 'envoye' status is a locked snapshot of what the client saw.
// Editing after that always opens a new draft (new number), cloning the
// prior items as a starting point — never mutates a sent version.
export async function getOrCreateDraftVersion(
  supabase: SupabaseClient,
  userId: string,
  actionId: string
): Promise<string> {
  const { data: latest } = await supabase
    .from('devis_versions')
    .select('id, status')
    .eq('action_id', actionId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (latest && latest.status === 'brouillon') {
    return latest.id
  }

  const number = await nextDevisNumber(supabase, userId)
  const { data: draft, error } = await supabase
    .from('devis_versions')
    .insert({ user_id: userId, action_id: actionId, number, status: 'brouillon' })
    .select('id')
    .single()
  if (error || !draft) throw new Error('failed to create devis draft')

  if (latest) {
    const { data: priorItems } = await supabase
      .from('devis_items')
      .select('description, quantity, unit_price, position')
      .eq('version_id', latest.id)
      .order('position')

    if (priorItems && priorItems.length > 0) {
      await supabase.from('devis_items').insert(
        priorItems.map((item) => ({
          user_id: userId,
          action_id: actionId,
          version_id: draft.id,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          position: item.position,
        }))
      )
    }
  }

  return draft.id
}

export async function recomputeActionAmount(supabase: SupabaseClient, actionId: string, versionId: string) {
  const { data: items } = await supabase.from('devis_items').select('quantity, unit_price').eq('version_id', versionId)
  const total = (items ?? []).reduce((sum, i) => sum + Number(i.quantity) * Number(i.unit_price), 0)
  await supabase.from('actions').update({ amount: total }).eq('id', actionId)
}

export async function countDevisSentThisMonth(supabase: SupabaseClient, userId: string): Promise<number> {
  const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()
  const { count } = await supabase
    .from('devis_versions')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('status', 'envoye')
    .gte('sent_at', startOfMonth)
  return count ?? 0
}
