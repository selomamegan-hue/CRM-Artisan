import 'server-only'
import { randomBytes } from 'node:crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import { devisMonthlyLimit, type Plan } from '@/lib/plans'

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
  actionId: string,
  defaultVatRate?: number | null
): Promise<string> {
  const { data: latest } = await supabase
    .from('devis_versions')
    .select('id, status, discount_amount, vat_rate')
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
    .insert({
      user_id: userId,
      action_id: actionId,
      number,
      status: 'brouillon',
      // Une révision reprend la remise/TVA du devis précédent ; le tout
      // premier brouillon part du réglage TVA par défaut du profil.
      discount_amount: latest?.discount_amount ?? 0,
      vat_rate: latest ? latest.vat_rate : (defaultVatRate ?? null),
    })
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

export function computeDevisTotal(subtotal: number, discountAmount: number, vatRate: number | null): number {
  const afterDiscount = Math.max(0, subtotal - discountAmount)
  const vat = vatRate ? afterDiscount * (vatRate / 100) : 0
  return afterDiscount + vat
}

export async function recomputeActionAmount(supabase: SupabaseClient, actionId: string, versionId: string) {
  const [{ data: items }, { data: version }] = await Promise.all([
    supabase.from('devis_items').select('quantity, unit_price').eq('version_id', versionId),
    supabase.from('devis_versions').select('discount_amount, vat_rate').eq('id', versionId).single(),
  ])
  const subtotal = (items ?? []).reduce((sum, i) => sum + Number(i.quantity) * Number(i.unit_price), 0)
  const total = computeDevisTotal(subtotal, Number(version?.discount_amount ?? 0), version?.vat_rate != null ? Number(version.vat_rate) : null)
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

// Un jeton de partage doit rester impossible à deviner : 24 octets tirés au
// hasard, soit 48 caractères hexadécimaux.
function newPublicToken(): string {
  return randomBytes(24).toString('hex')
}

export type SentDevisVersion = {
  id: string
  number: string
  status: string
  validated_at: string | null
  discount_amount: number | null
  vat_rate: number | null
  public_token: string
}

const SENT_COLUMNS = 'id, number, status, validated_at, discount_amount, vat_rate, public_token'

export type SendResult =
  | { ok: true; version: SentDevisVersion }
  | { ok: false; reason: 'quota'; limit: number }
  | { ok: false; reason: 'failed' }

// Envoyer un devis, c'est le figer. Le brouillon courant (ou un brouillon
// créé à la volée) passe en 'envoye', garde son numéro pour toujours et
// reçoit son lien public. Renvoyer un devis déjà envoyé ne consomme rien du
// quota mensuel et redonne le même lien : le client qui rouvre son adresse
// doit retrouver exactement le document qu'on lui a montré.
export async function sendDevisVersion(
  supabase: SupabaseClient,
  ownerId: string,
  actionId: string,
  plan: Plan
): Promise<SendResult> {
  const { data: latest } = await supabase
    .from('devis_versions')
    .select(SENT_COLUMNS)
    .eq('action_id', actionId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (latest && latest.status === 'envoye') {
    if (latest.public_token) return { ok: true, version: latest as SentDevisVersion }

    // Devis figé avant l'arrivée des liens publics : on lui en attribue un
    // sans le compter comme un nouvel envoi.
    const { data: backfilled } = await supabase
      .from('devis_versions')
      .update({ public_token: newPublicToken() })
      .eq('id', latest.id)
      .select(SENT_COLUMNS)
      .single()
    return backfilled ? { ok: true, version: backfilled as SentDevisVersion } : { ok: false, reason: 'failed' }
  }

  const limit = devisMonthlyLimit(plan)
  if (limit != null) {
    const used = await countDevisSentThisMonth(supabase, ownerId)
    if (used >= limit) return { ok: false, reason: 'quota', limit }
  }

  const versionId = latest ? latest.id : await getOrCreateDraftVersion(supabase, ownerId, actionId)
  const { data: locked } = await supabase
    .from('devis_versions')
    .update({ status: 'envoye', sent_at: new Date().toISOString(), public_token: newPublicToken() })
    .eq('id', versionId)
    .select(SENT_COLUMNS)
    .single()

  return locked ? { ok: true, version: locked as SentDevisVersion } : { ok: false, reason: 'failed' }
}
