import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { planHasFeature, type Plan } from '@/lib/plans'
import { renderDevisPdf, fetchLogo } from '@/lib/devis-pdf'

/* Le devis vu par le client, sans compte Bonfil.
   L'artisan lui a envoyé cette adresse sur WhatsApp ; elle ne porte pas
   l'identifiant du devis mais un jeton aléatoire, et ne donne accès qu'au
   PDF d'une version déjà envoyée (voir la fonction SQL devis_public). */

type DevisPublic = {
  number: string
  validated: boolean
  discount_amount: number | string
  vat_rate: number | string | null
  plan: Plan
  company_name: string | null
  company_address: string | null
  company_whatsapp: string | null
  logo_url: string | null
  client_name: string | null
  client_phone: string | null
  excerpt: string
  amount: number | null
  amount_paid: number
  items: { description: string; quantity: number | string; unit_price: number | string }[]
  created_at: string
}

const TOKEN_FORMAT = /^[0-9a-f]{48}$/

function pageIntrouvable() {
  // Le destinataire est un client, pas un développeur : il lui faut une
  // phrase, pas un JSON d'erreur.
  const html = `<!doctype html>
<html lang="fr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Devis introuvable · Bonfil</title>
<style>
  body { margin:0; min-height:100vh; display:flex; align-items:center; justify-content:center;
         background:#F1ECE2; color:#22303A; font-family:system-ui,-apple-system,'Segoe UI',sans-serif; padding:24px; }
  .carte { max-width:380px; text-align:center; }
  h1 { font-size:20px; margin:0 0 12px; }
  p { font-size:15px; line-height:1.55; color:#5B6B72; margin:0 0 10px; }
  a { color:#1A5F7A; font-weight:600; }
</style></head>
<body><div class="carte">
  <h1>Ce devis n'est plus disponible</h1>
  <p>Le lien est peut-être incomplet, ou l'artisan a envoyé une version plus récente.</p>
  <p>Demandez-lui de vous le renvoyer.</p>
  <p style="margin-top:22px"><a href="https://bonfil.app">bonfil.app</a></p>
</div></body></html>`
  return new NextResponse(html, {
    status: 404,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}

export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  if (!TOKEN_FORMAT.test(token)) return pageIntrouvable()

  const supabase = await createClient()
  const { data } = await supabase.rpc('devis_public', { p_token: token })
  const devis = data as DevisPublic | null
  if (!devis) return pageIntrouvable()

  const canUseLogo = planHasFeature(devis.plan, 'devis_logo')
  const canUseStamps = planHasFeature(devis.plan, 'devis_stamps')

  const logo = canUseLogo && devis.logo_url ? await fetchLogo(devis.logo_url) : null
  const paidInFull = canUseStamps && devis.amount != null && devis.amount - devis.amount_paid <= 0

  const pdfBuffer = await renderDevisPdf({
    number: devis.number,
    companyName: devis.company_name?.trim() || 'Artisan',
    companyAddress: devis.company_address ?? null,
    companyWhatsapp: devis.company_whatsapp ?? null,
    clientName: devis.client_name ?? 'Client',
    clientPhone: devis.client_phone ?? null,
    date: new Date(devis.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }),
    excerpt: devis.excerpt,
    amount: devis.amount,
    items: (devis.items ?? []).map((i) => ({
      description: i.description,
      quantity: Number(i.quantity),
      unit_price: Number(i.unit_price),
    })),
    logo,
    validated: canUseStamps && devis.validated,
    paidInFull,
    discountAmount: Number(devis.discount_amount ?? 0),
    vatRate: devis.vat_rate != null ? Number(devis.vat_rate) : null,
  })

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="devis-${devis.number}.pdf"`,
      // Un devis figé ne change plus : le client peut le rouvrir hors ligne.
      'Cache-Control': 'private, max-age=3600',
    },
  })
}
