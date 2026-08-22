import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getUserPlan } from '@/lib/plans-server'
import { planHasFeature } from '@/lib/plans'
import { renderDevisPdf } from '@/lib/devis-pdf'
import { getOrCreateDraftVersion } from '@/lib/devis-versions'

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
      .select('excerpt, amount, created_at, clients(name, phone)')
      .eq('id', id)
      .single(),
    supabase.from('profiles').select('full_name, phone, whatsapp').eq('id', user.id).single(),
  ])

  if (!action) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  // Downloading the PDF is what "sending" a devis means in Bonfil — the
  // current draft (or a freshly created one, if none exists yet) locks
  // here and keeps its number forever. Re-downloading an already-sent
  // devis just re-renders the same locked snapshot.
  let { data: version } = await supabase
    .from('devis_versions')
    .select('id, number, status')
    .eq('action_id', id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!version || version.status === 'brouillon') {
    const versionId = version ? version.id : await getOrCreateDraftVersion(supabase, user.id, id)
    const { data: locked } = await supabase
      .from('devis_versions')
      .update({ status: 'envoye', sent_at: new Date().toISOString() })
      .eq('id', versionId)
      .select('id, number, status')
      .single()
    version = locked
  }

  const { data: items } = await supabase
    .from('devis_items')
    .select('description, quantity, unit_price')
    .eq('version_id', version!.id)
    .order('position')

  const client = action.clients as unknown as { name: string; phone: string | null } | null

  const pdfBuffer = await renderDevisPdf({
    number: version!.number,
    companyName: profile?.full_name?.trim() || 'Artisan',
    companyPhone: profile?.phone ?? null,
    companyWhatsapp: profile?.whatsapp ?? null,
    clientName: client?.name ?? 'Client',
    clientPhone: client?.phone ?? null,
    date: new Date(action.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }),
    excerpt: action.excerpt,
    items: (items ?? []).map((i) => ({ description: i.description, quantity: Number(i.quantity), unit_price: Number(i.unit_price) })),
  })

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="devis-${version!.number}.pdf"`,
    },
  })
}
