import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getUserPlan } from '@/lib/plans-server'
import { planHasFeature, devisMonthlyLimit } from '@/lib/plans'
import { renderDevisPdf, type DevisLogo } from '@/lib/devis-pdf'
import { getOrCreateDraftVersion, countDevisSentThisMonth } from '@/lib/devis-versions'

async function fetchLogo(url: string): Promise<DevisLogo | null> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 5000)
    const res = await fetch(url, { signal: controller.signal })
    clearTimeout(timeout)
    if (!res.ok) return null

    const contentType = res.headers.get('content-type') ?? ''
    const mime = contentType.includes('png') ? 'image/png' : contentType.includes('jpeg') || contentType.includes('jpg') ? 'image/jpeg' : null
    if (!mime) return null

    const base64 = Buffer.from(await res.arrayBuffer()).toString('base64')
    return `data:${mime};base64,${base64}`
  } catch {
    // Un logo manquant ne doit jamais faire échouer tout le PDF.
    return null
  }
}

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

  const [{ data: action }, { data: profile }] = await Promise.all([
    supabase
      .from('actions')
      .select('excerpt, amount, amount_paid, created_at, clients(name, phone)')
      .eq('id', id)
      .single(),
    supabase.from('profiles').select('full_name, phone, whatsapp, logo_url').eq('id', user.id).single(),
  ])

  if (!action) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  // Downloading the PDF is what "sending" a devis means in Bonfil — the
  // current draft (or a freshly created one, if none exists yet) locks
  // here and keeps its number forever. Re-downloading an already-sent
  // devis just re-renders the same locked snapshot.
  let { data: version } = await supabase
    .from('devis_versions')
    .select('id, number, status, validated_at, discount_amount, vat_rate')
    .eq('action_id', id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!version || version.status === 'brouillon') {
    const limit = devisMonthlyLimit(plan)
    if (limit != null) {
      const used = await countDevisSentThisMonth(supabase, user.id)
      if (used >= limit) {
        return NextResponse.json({ error: 'devis_quota_exceeded', limit }, { status: 403 })
      }
    }

    const versionId = version ? version.id : await getOrCreateDraftVersion(supabase, user.id, id)
    const { data: locked } = await supabase
      .from('devis_versions')
      .update({ status: 'envoye', sent_at: new Date().toISOString() })
      .eq('id', versionId)
      .select('id, number, status, validated_at, discount_amount, vat_rate')
      .single()
    version = locked
  }

  const { data: items } = await supabase
    .from('devis_items')
    .select('description, quantity, unit_price')
    .eq('version_id', version!.id)
    .order('position')

  const client = action.clients as unknown as { name: string; phone: string | null } | null

  const canUseLogo = planHasFeature(plan, 'devis_logo')
  const canUseStamps = planHasFeature(plan, 'devis_stamps')

  const logo = canUseLogo && profile?.logo_url ? await fetchLogo(profile.logo_url) : null
  const paidInFull = canUseStamps && action.amount != null && action.amount - action.amount_paid <= 0
  const validated = canUseStamps && version!.validated_at != null

  const pdfBuffer = await renderDevisPdf({
    number: version!.number,
    companyName: profile?.full_name?.trim() || 'Artisan',
    companyPhone: profile?.phone ?? null,
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
    discountAmount: Number(version!.discount_amount ?? 0),
    vatRate: version!.vat_rate != null ? Number(version!.vat_rate) : null,
  })

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="devis-${version!.number}.pdf"`,
    },
  })
}
