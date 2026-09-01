import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getUserPlan } from '@/lib/plans-server'
import { planHasFeature } from '@/lib/plans'
import { renderDevisPdf, fetchLogo } from '@/lib/devis-pdf'
import { sendDevisVersion } from '@/lib/devis-versions'
import { resolveOwnerId } from '@/lib/delegates'

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const plan = await getUserPlan()
  if (!planHasFeature(plan, 'devis_pdf')) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const ownerId = await resolveOwnerId(supabase, user.id)

  const [{ data: action }, { data: profile }] = await Promise.all([
    supabase
      .from('actions')
      .select('excerpt, amount, amount_paid, created_at, clients(name, phone)')
      .eq('id', id)
      .single(),
    supabase.from('profiles').select('full_name, address, whatsapp, logo_url').eq('id', ownerId).single(),
  ])

  if (!action) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  // Télécharger le PDF, c'est envoyer le devis : la version se fige ici et
  // garde son numéro pour toujours. Retélécharger un devis déjà envoyé
  // rejoue le même instantané, sans rien consommer du quota.
  const sent = await sendDevisVersion(supabase, ownerId, id, plan)
  if (!sent.ok) {
    return sent.reason === 'quota'
      ? NextResponse.json({ error: 'devis_quota_exceeded', limit: sent.limit }, { status: 403 })
      : NextResponse.json({ error: 'not_found' }, { status: 404 })
  }
  const version = sent.version

  const { data: items } = await supabase
    .from('devis_items')
    .select('description, quantity, unit_price')
    .eq('version_id', version.id)
    .order('position')

  const client = action.clients as unknown as { name: string; phone: string | null } | null

  const canUseLogo = planHasFeature(plan, 'devis_logo')
  const canUseStamps = planHasFeature(plan, 'devis_stamps')

  const logo = canUseLogo && profile?.logo_url ? await fetchLogo(profile.logo_url) : null
  const paidInFull = canUseStamps && action.amount != null && action.amount - action.amount_paid <= 0
  const validated = canUseStamps && version.validated_at != null

  const pdfBuffer = await renderDevisPdf({
    number: version.number,
    companyName: profile?.full_name?.trim() || 'Artisan',
    companyAddress: profile?.address ?? null,
    companyWhatsapp: profile?.whatsapp ?? null,
    clientName: client?.name ?? 'Client',
    clientPhone: client?.phone ?? null,
    date: new Date(action.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }),
    excerpt: action.excerpt,
    amount: action.amount,
    items: (items ?? []).map((i) => ({ description: i.description, quantity: Number(i.quantity), unit_price: Number(i.unit_price) })),
    logo,
    validated,
    paidInFull,
    discountAmount: Number(version.discount_amount ?? 0),
    vatRate: version.vat_rate != null ? Number(version.vat_rate) : null,
  })

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="devis-${version.number}.pdf"`,
    },
  })
}
